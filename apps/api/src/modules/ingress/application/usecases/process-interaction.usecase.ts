import { randomUUID } from 'node:crypto';
import type { Redis } from 'ioredis';
import type { Queue } from 'bullmq';
import type { SessionRepository } from '../../../sessions/application/repositories/session.repository.js';
import type { InteractionRepository } from '../../../sessions/application/repositories/interaction.repository.js';
import {
  SessionStatus,
  InteractionStatus,
} from '../../../sessions/domain/session.types.js';
import type { GameRegistry } from '../../../../common/registry/game-registry.js';
import type {
  NormalizedInteraction,
  GameInteraction,
  CommentInteraction,
  RecognizedGiftContribution,
  GiftInteraction,
} from '../../../../contracts/ingress.js';

export interface ProcessInteractionInput {
  sessionId: string;
  interaction: NormalizedInteraction | GameInteraction;
  idempotencyKey?: string;
}

export interface ProcessInteractionResult {
  status: 'PROCESSED' | 'BUFFERED' | 'DUPLICATE' | 'IGNORED';
  duplicate?: boolean;
  pending?: boolean;
  reason?: string;
  command?: unknown;
  interactionId?: string;
}

export class ProcessInteractionUseCase {
  constructor(
    private readonly redis: Redis,
    private readonly sessionRepository: SessionRepository,
    private readonly interactionRepository: InteractionRepository,
    private readonly gameRegistry: GameRegistry,
    private readonly commandQueue: Queue,
  ) {}

  async clearPending(sessionId: string): Promise<boolean> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      return false;
    }
    await this.commandQueue.add('execute-command', {
      sessionId: session.id,
      gameId: session.gameId,
      command: { type: 'CLEAR_PENDING', timestamp: Date.now() },
      timestamp: Date.now(),
    });
    return true;
  }

  async execute(
    input: ProcessInteractionInput,
  ): Promise<ProcessInteractionResult> {
    const key =
      input.idempotencyKey ?? input.interaction.id ?? `gen-${randomUUID()}`;
    const redisKey = `idempotency:${key}`;

    // 1. Fast edge deduplication via Redis SET NX EX 300
    const setRes = await this.redis.set(redisKey, '1', 'EX', 300, 'NX');
    if (setRes !== 'OK') {
      return { status: 'DUPLICATE', duplicate: true };
    }

    // 2. Validate Session
    const session = await this.sessionRepository.findById(input.sessionId);
    if (!session) {
      return { status: 'IGNORED', reason: 'SESSION_NOT_FOUND' };
    }

    if (session.status === SessionStatus.ENDED) {
      return { status: 'IGNORED', reason: 'SESSION_ENDED' };
    }

    // 3. Extract Payload
    const payload = this.extractPayload(input.interaction);

    // 4. PostgreSQL Persistence
    let created;
    try {
      created = await this.interactionRepository.create({
        sessionId: session.id,
        idempotencyKey: key,
        type: input.interaction.type,
        source: input.interaction.source,
        userId: input.interaction.userId,
        userName: input.interaction.userName,
        payload,
        status: InteractionStatus.PENDING,
      });
    } catch {
      // Postgres unique constraint failure (e.g. duplicate key race)
      return { status: 'DUPLICATE', duplicate: true };
    }

    // 5. Buffer if Session is PAUSED
    if (session.status === SessionStatus.PAUSED) {
      return {
        status: 'BUFFERED',
        pending: true,
        interactionId: created.id,
      };
    }

    // 6. Ignore if CONFIGURING
    if (session.status === SessionStatus.CONFIGURING) {
      await this.interactionRepository.updateStatus(
        created.id,
        InteractionStatus.IGNORED,
        new Date(),
      );
      return {
        status: 'IGNORED',
        reason: 'SESSION_CONFIGURING',
        interactionId: created.id,
      };
    }

    // 7. Session is RUNNING: Map Interaction and Enqueue Game Command
    return this.processRunningInteraction(
      session.id,
      session.gameId,
      session.config,
      created.id,
      input.interaction as GameInteraction,
    );
  }

  private async processRunningInteraction(
    sessionId: string,
    gameId: string,
    sessionConfig: Record<string, unknown>,
    interactionId: string,
    interaction: GameInteraction,
  ): Promise<ProcessInteractionResult> {
    const game = this.gameRegistry.getGame(gameId);
    const command = game.mapper.mapInteraction(interaction, sessionConfig);

    if (command !== null) {
      await this.commandQueue.add('execute-command', {
        sessionId,
        gameId,
        command,
        timestamp: Date.now(),
      });

      await this.interactionRepository.updateStatus(
        interactionId,
        InteractionStatus.PROCESSED,
        new Date(),
      );

      return {
        status: 'PROCESSED',
        command,
        interactionId,
      };
    }

    await this.interactionRepository.updateStatus(
      interactionId,
      InteractionStatus.IGNORED,
      new Date(),
    );

    return {
      status: 'IGNORED',
      reason: 'UNMAPPED',
      interactionId,
    };
  }

  private extractPayload(
    interaction: NormalizedInteraction | GameInteraction,
  ): Record<string, unknown> {
    if (interaction.type === 'comment') {
      const commentInt = interaction as CommentInteraction;
      return { comment: commentInt.comment };
    }
    if (interaction.type === 'gift_contribution') {
      const giftInt = interaction as RecognizedGiftContribution;
      return {
        resourceKey: giftInt.resourceKey,
        units: giftInt.units,
      };
    }
    if (interaction.type === 'gift') {
      const giftInt = interaction as GiftInteraction;
      return {
        resourceKey: giftInt.resourceKey,
        cumulativeCount: giftInt.cumulativeCount,
        sequenceId: giftInt.sequenceId,
      };
    }
    return {};
  }
}
