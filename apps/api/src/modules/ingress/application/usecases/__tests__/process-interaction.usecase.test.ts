import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Redis } from 'ioredis';
import type { Queue } from 'bullmq';
import { ProcessInteractionUseCase } from '../process-interaction.usecase.js';
import type { SessionRepository } from '../../../../sessions/application/repositories/session.repository.js';
import type { InteractionRepository } from '../../../../sessions/application/repositories/interaction.repository.js';
import {
  SessionStatus,
  InteractionStatus,
  type GameSession,
} from '../../../../sessions/domain/session.types.js';
import { GameRegistry } from '../../../../../common/registry/game-registry.js';
import {
  axbGameModule,
  DEFAULT_AXB_CONFIG,
} from '../../../../games/axb/index.js';
import type {
  CommentInteraction,
  RecognizedGiftContribution,
} from '../../../../../contracts/ingress.js';

describe('ProcessInteractionUseCase', () => {
  let redis: Redis;
  let sessionRepo: SessionRepository;
  let interactionRepo: InteractionRepository;
  let gameRegistry: GameRegistry;
  let commandQueue: Queue;
  let usecase: ProcessInteractionUseCase;

  const mockSession: GameSession = {
    id: 'session-123',
    gameId: 'axb',
    operatorId: 'op-1',
    status: SessionStatus.RUNNING,
    title: 'Live Battle',
    config: DEFAULT_AXB_CONFIG as unknown as Record<string, unknown>,
    startedAt: new Date(),
    endedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    gameRegistry = new GameRegistry();
    gameRegistry.registerGame(axbGameModule);

    const redisStore = new Set<string>();
    redis = {
      set: vi.fn(
        async (
          key: string,
          val: string,
          mode: string,
          ttl: number,
          flag: string,
        ) => {
          if (flag === 'NX' && redisStore.has(key)) {
            return null;
          }
          redisStore.add(key);
          return 'OK';
        },
      ),
    } as unknown as Redis;

    sessionRepo = {
      create: vi.fn(),
      findById: vi.fn(async (id: string) =>
        id === mockSession.id ? { ...mockSession } : null,
      ),
      findByStatus: vi.fn(async () => [mockSession]),
      updateStatus: vi.fn(),
    };

    interactionRepo = {
      create: vi.fn(async (input) => ({
        id: 'interaction-uuid',
        sessionId: input.sessionId,
        idempotencyKey: input.idempotencyKey,
        type: input.type,
        source: input.source,
        userId: input.userId,
        userName: input.userName,
        payload: input.payload,
        status: input.status ?? InteractionStatus.PENDING,
        createdAt: new Date(),
        processedAt: null,
      })),
      findByIdempotencyKey: vi.fn(),
      findPendingBySessionId: vi.fn(),
      updateStatus: vi.fn(async (id, status, processedAt) => ({
        id,
        sessionId: mockSession.id,
        idempotencyKey: 'key',
        type: 'comment',
        source: 'SIMULATOR',
        userId: 'u1',
        userName: 'User',
        payload: {},
        status,
        createdAt: new Date(),
        processedAt: processedAt ?? null,
      })),
    };

    commandQueue = {
      add: vi.fn().mockResolvedValue({ id: 'job-cmd-1' }),
    } as unknown as Queue;

    usecase = new ProcessInteractionUseCase(
      redis,
      sessionRepo,
      interactionRepo,
      gameRegistry,
      commandQueue,
    );
  });

  it('should process comment interaction, enqueue game command, and mark as PROCESSED when session is RUNNING', async () => {
    const interaction: CommentInteraction = {
      id: 'event-1',
      source: 'SIMULATOR',
      userId: 'user-a',
      userName: 'Alice',
      type: 'comment',
      comment: 'A',
      timestamp: Date.now(),
    };

    const result = await usecase.execute({
      sessionId: mockSession.id,
      interaction,
    });

    expect(result.status).toBe('PROCESSED');
    expect(result.command).toEqual(
      expect.objectContaining({
        type: 'VOTE',
        team: 'A',
        userId: 'user-a',
      }),
    );
    expect(commandQueue.add).toHaveBeenCalledWith('execute-command', {
      sessionId: mockSession.id,
      gameId: 'axb',
      command: expect.objectContaining({ type: 'VOTE', team: 'A' }),
      timestamp: expect.any(Number),
    });
    expect(interactionRepo.updateStatus).toHaveBeenCalledWith(
      'interaction-uuid',
      InteractionStatus.PROCESSED,
      expect.any(Date),
    );
  });

  it('should process gift contribution, enqueue game command, and mark as PROCESSED', async () => {
    const gift: RecognizedGiftContribution = {
      id: 'gift-event-1',
      source: 'TIKTOK_LIVE',
      userId: 'user-b',
      userName: 'Bob',
      type: 'gift_contribution',
      resourceKey: 'tiktok:gift:5879', // 10 points to Team B
      units: 2,
      timestamp: Date.now(),
    };

    const result = await usecase.execute({
      sessionId: mockSession.id,
      interaction: gift,
    });

    expect(result.status).toBe('PROCESSED');
    expect(result.command).toEqual(
      expect.objectContaining({
        type: 'GIFT',
        team: 'B',
        units: 2,
        pointsPerUnit: 10,
      }),
    );
    expect(commandQueue.add).toHaveBeenCalledTimes(1);
  });

  it('should drop duplicate interactions when Redis SET NX returns null', async () => {
    const interaction: CommentInteraction = {
      id: 'dup-1',
      source: 'SIMULATOR',
      userId: 'user-a',
      userName: 'Alice',
      type: 'comment',
      comment: 'A',
      timestamp: Date.now(),
    };

    const first = await usecase.execute({
      sessionId: mockSession.id,
      interaction,
      idempotencyKey: 'same-key',
    });
    expect(first.status).toBe('PROCESSED');

    const second = await usecase.execute({
      sessionId: mockSession.id,
      interaction,
      idempotencyKey: 'same-key',
    });
    expect(second.status).toBe('DUPLICATE');
    expect(second.duplicate).toBe(true);
    expect(commandQueue.add).toHaveBeenCalledTimes(1);
  });

  it('should buffer interaction as PENDING without enqueuing command when session is PAUSED', async () => {
    vi.mocked(sessionRepo.findById).mockResolvedValueOnce({
      ...mockSession,
      status: SessionStatus.PAUSED,
    });

    const interaction: CommentInteraction = {
      id: 'paused-1',
      source: 'SIMULATOR',
      userId: 'user-c',
      userName: 'Charlie',
      type: 'comment',
      comment: 'A',
      timestamp: Date.now(),
    };

    const result = await usecase.execute({
      sessionId: mockSession.id,
      interaction,
    });

    expect(result.status).toBe('BUFFERED');
    expect(result.pending).toBe(true);
    expect(commandQueue.add).not.toHaveBeenCalled();
    expect(interactionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: InteractionStatus.PENDING,
      }),
    );
  });

  it('should ignore unmapped comments (e.g. "Hello")', async () => {
    const interaction: CommentInteraction = {
      id: 'unmapped-1',
      source: 'SIMULATOR',
      userId: 'user-d',
      userName: 'Dan',
      type: 'comment',
      comment: 'Hello everyone!',
      timestamp: Date.now(),
    };

    const result = await usecase.execute({
      sessionId: mockSession.id,
      interaction,
    });

    expect(result.status).toBe('IGNORED');
    expect(result.reason).toBe('UNMAPPED');
    expect(commandQueue.add).not.toHaveBeenCalled();
    expect(interactionRepo.updateStatus).toHaveBeenCalledWith(
      'interaction-uuid',
      InteractionStatus.IGNORED,
      expect.any(Date),
    );
  });

  it('should ignore interaction if session is not found or is ENDED', async () => {
    vi.mocked(sessionRepo.findById).mockResolvedValueOnce(null);

    const interaction1: CommentInteraction = {
      id: 'missing-sess-1',
      source: 'SIMULATOR',
      userId: 'user-e',
      userName: 'Eve',
      type: 'comment',
      comment: 'A',
      timestamp: Date.now(),
    };

    const resultNotFound = await usecase.execute({
      sessionId: 'non-existent',
      interaction: interaction1,
    });
    expect(resultNotFound.status).toBe('IGNORED');
    expect(resultNotFound.reason).toBe('SESSION_NOT_FOUND');

    vi.mocked(sessionRepo.findById).mockResolvedValueOnce({
      ...mockSession,
      status: SessionStatus.ENDED,
    });

    const interaction2: CommentInteraction = {
      id: 'ended-sess-1',
      source: 'SIMULATOR',
      userId: 'user-e',
      userName: 'Eve',
      type: 'comment',
      comment: 'A',
      timestamp: Date.now(),
    };

    const resultEnded = await usecase.execute({
      sessionId: mockSession.id,
      interaction: interaction2,
    });
    expect(resultEnded.status).toBe('IGNORED');
    expect(resultEnded.reason).toBe('SESSION_ENDED');
  });

  it('should ignore interaction if session is CONFIGURING and mark as IGNORED', async () => {
    vi.mocked(sessionRepo.findById).mockResolvedValueOnce({
      ...mockSession,
      status: SessionStatus.CONFIGURING,
    });

    const interaction: CommentInteraction = {
      id: 'cfg-int-1',
      source: 'SIMULATOR',
      userId: 'user-cfg',
      userName: 'Cfg User',
      type: 'comment',
      comment: 'A',
      timestamp: Date.now(),
    };

    const result = await usecase.execute({
      sessionId: mockSession.id,
      interaction,
    });

    expect(result.status).toBe('IGNORED');
    expect(result.reason).toBe('SESSION_CONFIGURING');
    expect(interactionRepo.updateStatus).toHaveBeenCalledWith(
      'interaction-uuid',
      InteractionStatus.IGNORED,
      expect.any(Date),
    );
  });

  it('should extract gift interaction with cumulative count and sequenceId correctly', async () => {
    vi.mocked(sessionRepo.findById).mockResolvedValueOnce({
      ...mockSession,
      status: SessionStatus.PAUSED,
    });

    const result = await usecase.execute({
      sessionId: mockSession.id,
      interaction: {
        id: 'gift-cum-1',
        source: 'TIKTOK_LIVE',
        userId: 'u-gift',
        userName: 'Gifter',
        type: 'gift',
        resourceKey: 'tiktok:gift:5655',
        cumulativeCount: 5,
        sequenceId: 'seq-123',
        timestamp: Date.now(),
      },
    });

    expect(result.status).toBe('BUFFERED');
    expect(interactionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {
          resourceKey: 'tiktok:gift:5655',
          cumulativeCount: 5,
          sequenceId: 'seq-123',
        },
      }),
    );
  });

  it('should handle database unique constraint error gracefully as DUPLICATE', async () => {
    vi.mocked(interactionRepo.create).mockRejectedValueOnce(
      new Error('duplicate key value violates unique constraint'),
    );

    const interaction: CommentInteraction = {
      id: 'db-dup-1',
      source: 'SIMULATOR',
      userId: 'user-db',
      userName: 'DB User',
      type: 'comment',
      comment: 'A',
      timestamp: Date.now(),
    };

    const result = await usecase.execute({
      sessionId: mockSession.id,
      interaction,
    });

    expect(result.status).toBe('DUPLICATE');
    expect(result.duplicate).toBe(true);
  });
});
