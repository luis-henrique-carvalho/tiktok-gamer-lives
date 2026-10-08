import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateSessionUseCase } from '../create-session.usecase.js';
import { StartSessionUseCase } from '../start-session.usecase.js';
import { PauseSessionUseCase } from '../pause-session.usecase.js';
import { ResumeSessionUseCase } from '../resume-session.usecase.js';
import { EndSessionUseCase } from '../end-session.usecase.js';
import {
  SessionStatus,
  InteractionStatus,
  type GameSession,
} from '../../../domain/session.types.js';
import type { SessionRepository } from '../../repositories/session.repository.js';
import type { SnapshotRepository } from '../../repositories/snapshot.repository.js';
import type { InteractionRepository } from '../../repositories/interaction.repository.js';
import { GameRegistry } from '../../../../../common/registry/game-registry.js';
import {
  axbGameModule,
  DEFAULT_AXB_CONFIG,
  type AxBConfig,
} from '../../../../games/axb/index.js';
import { NotFoundError } from '../../../../../common/domain/errors/not-found-error.js';
import { BadRequestError } from '../../../../../common/domain/errors/bad-request-error.js';
import type { Queue } from 'bullmq';

describe('Session Lifecycle Use Cases', () => {
  let sessionRepo: SessionRepository;
  let snapshotRepo: SnapshotRepository;
  let interactionRepo: InteractionRepository;
  let gameRegistry: GameRegistry;
  let commandQueue: Queue;

  beforeEach(() => {
    gameRegistry = new GameRegistry();
    gameRegistry.registerGame(axbGameModule);

    const sessions = new Map<string, GameSession>();
    sessionRepo = {
      create: vi.fn(async (input) => {
        const s: GameSession = {
          id: input.id ?? 'sess-1',
          gameId: input.gameId,
          operatorId: input.operatorId,
          title: input.title,
          status: input.status ?? SessionStatus.CONFIGURING,
          config: (input.config ?? DEFAULT_AXB_CONFIG) as unknown as Record<
            string,
            unknown
          >,
          startedAt: null,
          endedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        sessions.set(s.id, s);
        return s;
      }),
      findById: vi.fn(async (id) => sessions.get(id) ?? null),
      findByStatus: vi.fn(async (status) =>
        Array.from(sessions.values()).filter((s) => s.status === status),
      ),
      updateStatus: vi.fn(async (id, status, endedAt) => {
        const s = sessions.get(id);
        if (!s) return null;
        s.status = status;
        if (endedAt) s.endedAt = endedAt;
        if (status === SessionStatus.RUNNING && !s.startedAt)
          s.startedAt = new Date();
        return s;
      }),
    };

    snapshotRepo = {
      save: vi.fn(async (snap) => ({
        id: 'snap-1',
        ...snap,
        createdAt: new Date(),
      })),
      findLatestBySessionId: vi.fn(async () => null),
      findBySessionAndSequence: vi.fn(async () => null),
    };

    interactionRepo = {
      create: vi.fn(),
      findByIdempotencyKey: vi.fn(),
      findPendingBySessionId: vi.fn(async () => []),
      updateStatus: vi.fn(),
    };

    commandQueue = {
      add: vi.fn().mockResolvedValue({ id: 'job-1' }),
    } as unknown as Queue;
  });

  describe('CreateSessionUseCase', () => {
    it('should create a session with valid game and config', async () => {
      const usecase = new CreateSessionUseCase(sessionRepo, gameRegistry);
      const session = await usecase.execute({
        gameId: 'axb',
        operatorId: 'op-1',
        title: 'Batalha Top',
        config: { ...DEFAULT_AXB_CONFIG, scoreGoal: 500 } as unknown as Record<
          string,
          unknown
        >,
      });

      expect(session).toBeDefined();
      expect(session.gameId).toBe('axb');
      expect(session.status).toBe(SessionStatus.CONFIGURING);
      expect((session.config as unknown as AxBConfig).scoreGoal).toBe(500);
    });

    it('should throw NotFoundError if game is not registered', async () => {
      const usecase = new CreateSessionUseCase(sessionRepo, gameRegistry);
      await expect(
        usecase.execute({
          gameId: 'unknown-game',
          operatorId: 'op-1',
          title: 'Unknown',
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('StartSessionUseCase', () => {
    it('should transition session from CONFIGURING to RUNNING and initialize snapshot', async () => {
      const createUsecase = new CreateSessionUseCase(sessionRepo, gameRegistry);
      const session = await createUsecase.execute({
        id: 'sess-100',
        gameId: 'axb',
        operatorId: 'op-1',
        title: 'Test',
        config: DEFAULT_AXB_CONFIG as unknown as Record<string, unknown>,
      });

      const startUsecase = new StartSessionUseCase(
        sessionRepo,
        snapshotRepo,
        gameRegistry,
      );
      const started = await startUsecase.execute({ sessionId: session.id });

      expect(started.status).toBe(SessionStatus.RUNNING);
      expect(snapshotRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: session.id,
          gameId: 'axb',
          sequence: 0,
        }),
      );
    });

    it('should throw NotFoundError if session not found', async () => {
      const startUsecase = new StartSessionUseCase(
        sessionRepo,
        snapshotRepo,
        gameRegistry,
      );
      await expect(
        startUsecase.execute({ sessionId: 'non-existent' }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if updating status fails', async () => {
      const s = await sessionRepo.create({
        id: 'sess-fail-start',
        gameId: 'axb',
        operatorId: 'op-1',
        title: 'Fail Start',
        config: DEFAULT_AXB_CONFIG as unknown as Record<string, unknown>,
      });
      vi.mocked(sessionRepo.updateStatus).mockResolvedValueOnce(null);

      const startUsecase = new StartSessionUseCase(
        sessionRepo,
        snapshotRepo,
        gameRegistry,
      );
      await expect(startUsecase.execute({ sessionId: s.id })).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('PauseSessionUseCase', () => {
    it('should transition session from RUNNING to PAUSED', async () => {
      await sessionRepo.create({
        id: 'sess-pause',
        gameId: 'axb',
        operatorId: 'op-1',
        title: 'Pause Test',
        status: SessionStatus.RUNNING,
        config: DEFAULT_AXB_CONFIG as unknown as Record<string, unknown>,
      });

      const pauseUsecase = new PauseSessionUseCase(sessionRepo);
      const paused = await pauseUsecase.execute({ sessionId: 'sess-pause' });

      expect(paused.status).toBe(SessionStatus.PAUSED);
    });

    it('should throw BadRequestError if session is not RUNNING', async () => {
      await sessionRepo.create({
        id: 'sess-cfg',
        gameId: 'axb',
        operatorId: 'op-1',
        title: 'Cfg',
        status: SessionStatus.CONFIGURING,
        config: DEFAULT_AXB_CONFIG as unknown as Record<string, unknown>,
      });

      const pauseUsecase = new PauseSessionUseCase(sessionRepo);
      await expect(
        pauseUsecase.execute({ sessionId: 'sess-cfg' }),
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw NotFoundError if session not found', async () => {
      const pauseUsecase = new PauseSessionUseCase(sessionRepo);
      await expect(
        pauseUsecase.execute({ sessionId: 'non-existent' }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if updating status fails', async () => {
      const s = await sessionRepo.create({
        id: 'sess-fail-pause',
        gameId: 'axb',
        operatorId: 'op-1',
        title: 'Fail Pause',
        status: SessionStatus.RUNNING,
        config: DEFAULT_AXB_CONFIG as unknown as Record<string, unknown>,
      });
      vi.mocked(sessionRepo.updateStatus).mockResolvedValueOnce(null);

      const pauseUsecase = new PauseSessionUseCase(sessionRepo);
      await expect(pauseUsecase.execute({ sessionId: s.id })).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('ResumeSessionUseCase (Drain Pending FIFO)', () => {
    it('should transition session from PAUSED to RUNNING and drain pending interactions in FIFO order', async () => {
      await sessionRepo.create({
        id: 'sess-resume',
        gameId: 'axb',
        operatorId: 'op-1',
        title: 'Resume Test',
        status: SessionStatus.PAUSED,
        config: DEFAULT_AXB_CONFIG as unknown as Record<string, unknown>,
      });

      const pendingInteractions = [
        {
          id: 'int-1',
          sessionId: 'sess-resume',
          idempotencyKey: 'key-1',
          type: 'comment',
          source: 'SIMULATOR',
          userId: 'u1',
          userName: 'Alice',
          payload: { comment: 'A' },
          status: InteractionStatus.PENDING,
          createdAt: new Date(1000),
          processedAt: null,
        },
        {
          id: 'int-2',
          sessionId: 'sess-resume',
          idempotencyKey: 'key-2',
          type: 'comment',
          source: 'SIMULATOR',
          userId: 'u2',
          userName: 'Bob',
          payload: { comment: 'B' },
          status: InteractionStatus.PENDING,
          createdAt: new Date(2000),
          processedAt: null,
        },
        {
          id: 'int-unmapped',
          sessionId: 'sess-resume',
          idempotencyKey: 'key-3',
          type: 'comment',
          source: 'SIMULATOR',
          userId: 'u3',
          userName: 'Charlie',
          payload: { comment: 'Hello' },
          status: InteractionStatus.PENDING,
          createdAt: new Date(3000),
          processedAt: null,
        },
      ];

      vi.mocked(interactionRepo.findPendingBySessionId).mockResolvedValue(
        pendingInteractions,
      );

      const resumeUsecase = new ResumeSessionUseCase(
        sessionRepo,
        interactionRepo,
        gameRegistry,
        commandQueue,
      );

      const result = await resumeUsecase.execute({ sessionId: 'sess-resume' });

      expect(result.session.status).toBe(SessionStatus.RUNNING);
      expect(result.drainedCount).toBe(2);
      expect(commandQueue.add).toHaveBeenCalledTimes(3);
      expect(commandQueue.add).toHaveBeenCalledWith(
        'execute-command',
        expect.objectContaining({
          command: expect.objectContaining({ type: 'RESUME' }),
        }),
      );
      expect(interactionRepo.updateStatus).toHaveBeenCalledWith(
        'int-1',
        InteractionStatus.PROCESSED,
        expect.any(Date),
      );
      expect(interactionRepo.updateStatus).toHaveBeenCalledWith(
        'int-2',
        InteractionStatus.PROCESSED,
        expect.any(Date),
      );
      expect(interactionRepo.updateStatus).toHaveBeenCalledWith(
        'int-unmapped',
        InteractionStatus.IGNORED,
        expect.any(Date),
      );
    });

    it('should throw NotFoundError if session not found', async () => {
      const resumeUsecase = new ResumeSessionUseCase(
        sessionRepo,
        interactionRepo,
        gameRegistry,
        commandQueue,
      );
      await expect(
        resumeUsecase.execute({ sessionId: 'non-existent' }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError if session is not PAUSED', async () => {
      const s = await sessionRepo.create({
        id: 'sess-running',
        gameId: 'axb',
        operatorId: 'op-1',
        title: 'Running',
        status: SessionStatus.RUNNING,
        config: DEFAULT_AXB_CONFIG as unknown as Record<string, unknown>,
      });

      const resumeUsecase = new ResumeSessionUseCase(
        sessionRepo,
        interactionRepo,
        gameRegistry,
        commandQueue,
      );
      await expect(resumeUsecase.execute({ sessionId: s.id })).rejects.toThrow(
        BadRequestError,
      );
    });

    it('should throw NotFoundError if updating status fails', async () => {
      const s = await sessionRepo.create({
        id: 'sess-fail-resume',
        gameId: 'axb',
        operatorId: 'op-1',
        title: 'Fail Resume',
        status: SessionStatus.PAUSED,
        config: DEFAULT_AXB_CONFIG as unknown as Record<string, unknown>,
      });
      vi.mocked(sessionRepo.updateStatus).mockResolvedValueOnce(null);

      const resumeUsecase = new ResumeSessionUseCase(
        sessionRepo,
        interactionRepo,
        gameRegistry,
        commandQueue,
      );
      await expect(resumeUsecase.execute({ sessionId: s.id })).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('EndSessionUseCase', () => {
    it('should transition session to ENDED and set endedAt', async () => {
      await sessionRepo.create({
        id: 'sess-end',
        gameId: 'axb',
        operatorId: 'op-1',
        title: 'End Test',
        status: SessionStatus.RUNNING,
        config: DEFAULT_AXB_CONFIG as unknown as Record<string, unknown>,
      });

      const endUsecase = new EndSessionUseCase(sessionRepo);
      const ended = await endUsecase.execute({ sessionId: 'sess-end' });

      expect(ended.status).toBe(SessionStatus.ENDED);
      expect(ended.endedAt).toBeInstanceOf(Date);
    });

    it('should throw NotFoundError if session not found', async () => {
      const endUsecase = new EndSessionUseCase(sessionRepo);
      await expect(
        endUsecase.execute({ sessionId: 'non-existent' }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError if session already ended', async () => {
      const s = await sessionRepo.create({
        id: 'sess-already-ended',
        gameId: 'axb',
        operatorId: 'op-1',
        title: 'Ended',
        status: SessionStatus.ENDED,
        config: DEFAULT_AXB_CONFIG as unknown as Record<string, unknown>,
      });

      const endUsecase = new EndSessionUseCase(sessionRepo);
      await expect(endUsecase.execute({ sessionId: s.id })).rejects.toThrow(
        BadRequestError,
      );
    });

    it('should throw NotFoundError if updating status fails', async () => {
      const s = await sessionRepo.create({
        id: 'sess-fail-end',
        gameId: 'axb',
        operatorId: 'op-1',
        title: 'Fail End',
        status: SessionStatus.RUNNING,
        config: DEFAULT_AXB_CONFIG as unknown as Record<string, unknown>,
      });
      vi.mocked(sessionRepo.updateStatus).mockResolvedValueOnce(null);

      const endUsecase = new EndSessionUseCase(sessionRepo);
      await expect(endUsecase.execute({ sessionId: s.id })).rejects.toThrow(
        NotFoundError,
      );
    });

    it('should invoke onSessionEnded hook with sessionId when session is successfully ended', async () => {
      await sessionRepo.create({
        id: 'sess-hook',
        gameId: 'axb',
        operatorId: 'op-1',
        title: 'Hook Test',
        status: SessionStatus.RUNNING,
        config: DEFAULT_AXB_CONFIG as unknown as Record<string, unknown>,
      });

      const onSessionEnded = vi.fn();
      const endUsecase = new EndSessionUseCase(sessionRepo, onSessionEnded);
      await endUsecase.execute({ sessionId: 'sess-hook' });

      expect(onSessionEnded).toHaveBeenCalledTimes(1);
      expect(onSessionEnded).toHaveBeenCalledWith('sess-hook');
    });

    it('should not invoke onSessionEnded hook if session fails to end', async () => {
      const onSessionEnded = vi.fn();
      const endUsecase = new EndSessionUseCase(sessionRepo, onSessionEnded);

      await expect(
        endUsecase.execute({ sessionId: 'non-existent' }),
      ).rejects.toThrow(NotFoundError);

      expect(onSessionEnded).not.toHaveBeenCalled();
    });
  });
});
