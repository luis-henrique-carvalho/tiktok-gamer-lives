import type { Queue } from 'bullmq';
import type { SessionRepository } from '../repositories/session.repository.js';
import type { InteractionRepository } from '../repositories/interaction.repository.js';
import type { GameRegistry } from '../../../../common/registry/game-registry.js';
import { NotFoundError } from '../../../../common/domain/errors/not-found-error.js';
import { BadRequestError } from '../../../../common/domain/errors/bad-request-error.js';
import {
  type GameSession,
  SessionStatus,
  InteractionStatus,
} from '../../domain/session.types.js';
import type { GameInteraction } from '../../../../contracts/ingress.js';

export interface ResumeSessionInput {
  sessionId: string;
}

export interface ResumeSessionResult {
  session: GameSession;
  drainedCount: number;
}

export class ResumeSessionUseCase {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly interactionRepository: InteractionRepository,
    private readonly gameRegistry: GameRegistry,
    private readonly commandQueue: Queue,
  ) {}

  async execute(input: ResumeSessionInput): Promise<ResumeSessionResult> {
    const session = await this.sessionRepository.findById(input.sessionId);
    if (!session) {
      throw new NotFoundError(
        `Session with id "${input.sessionId}" was not found`,
      );
    }

    if (session.status !== SessionStatus.PAUSED) {
      throw new BadRequestError(
        `Cannot resume session with status "${session.status}"`,
      );
    }

    const updatedSession = await this.sessionRepository.updateStatus(
      session.id,
      SessionStatus.RUNNING,
    );

    if (!updatedSession) {
      throw new NotFoundError(
        `Failed to resume session with id "${input.sessionId}"`,
      );
    }

    const game = this.gameRegistry.getGame(session.gameId);
    const pending = await this.interactionRepository.findPendingBySessionId(
      session.id,
    );

    // Enqueue RESUME command to notify engine and wake up interval or pending state
    await this.commandQueue.add('execute-command', {
      sessionId: session.id,
      gameId: session.gameId,
      command: { type: 'RESUME', timestamp: Date.now() },
      timestamp: Date.now(),
    });

    let drainedCount = 0;
    for (const item of pending) {
      const interactionObj = {
        id: item.id,
        source: item.source as 'TIKTOK_LIVE' | 'SIMULATOR',
        userId: item.userId,
        userName: item.userName,
        timestamp: item.createdAt.getTime(),
        type: item.type,
        ...item.payload,
      } as unknown as GameInteraction;

      const command = game.mapper.mapInteraction(
        interactionObj,
        session.config,
      );

      if (command !== null) {
        await this.commandQueue.add('execute-command', {
          sessionId: session.id,
          gameId: session.gameId,
          command,
          timestamp: Date.now(),
        });
        await this.interactionRepository.updateStatus(
          item.id,
          InteractionStatus.PROCESSED,
          new Date(),
        );
        drainedCount++;
      } else {
        await this.interactionRepository.updateStatus(
          item.id,
          InteractionStatus.IGNORED,
          new Date(),
        );
      }
    }

    return {
      session: updatedSession,
      drainedCount,
    };
  }
}
