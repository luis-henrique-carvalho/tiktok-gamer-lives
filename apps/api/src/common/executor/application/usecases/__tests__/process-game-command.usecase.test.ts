import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProcessGameCommandUseCase } from '../process-game-command.usecase.js';
import type { SessionRepository } from '../../../../../modules/sessions/application/repositories/session.repository.js';
import type { SnapshotRepository } from '../../../../../modules/sessions/application/repositories/snapshot.repository.js';
import {
  SessionStatus,
  type GameSnapshot,
  type GameSession,
} from '../../../../../modules/sessions/domain/session.types.js';
import { GameRegistry } from '../../../../registry/game-registry.js';
import {
  axbGameModule,
  DEFAULT_AXB_CONFIG,
  type AxBState,
  type AxBProjection,
} from '../../../../../modules/games/axb/index.js';
import type { DeclarativeTimerService } from '../../../../timers/declarative-timer.service.js';
import { NotFoundError } from '../../../../domain/errors/not-found-error.js';

describe('ProcessGameCommandUseCase', () => {
  let sessionRepo: SessionRepository;
  let snapshotRepo: SnapshotRepository;
  let gameRegistry: GameRegistry;
  let timerService: DeclarativeTimerService;
  let usecase: ProcessGameCommandUseCase;

  const mockSession: GameSession = {
    id: 'session-game-1',
    gameId: 'axb',
    operatorId: 'op-1',
    status: 'RUNNING' as SessionStatus,
    title: 'Serial Battle',
    config: DEFAULT_AXB_CONFIG as unknown as Record<string, unknown>,
    startedAt: new Date(),
    endedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    gameRegistry = new GameRegistry();
    gameRegistry.registerGame(axbGameModule);

    sessionRepo = {
      create: vi.fn(),
      findById: vi.fn(async (id: string) =>
        id === mockSession.id ? mockSession : null,
      ),
      findByStatus: vi.fn(),
      updateStatus: vi.fn(),
    };

    const snapshots: GameSnapshot[] = [];
    snapshotRepo = {
      save: vi.fn(async (input) => {
        const snap: GameSnapshot = {
          id: `snap-${input.sequence}`,
          sessionId: input.sessionId,
          gameId: input.gameId,
          sequence: input.sequence,
          state: input.state,
          projection: input.projection,
          createdAt: new Date(),
        };
        snapshots.push(snap);
        return snap;
      }),
      findLatestBySessionId: vi.fn(
        async () => snapshots[snapshots.length - 1] ?? null,
      ),
      findBySessionAndSequence: vi.fn(),
    };

    timerService = {
      scheduleTimer: vi.fn().mockResolvedValue('timer-job-1'),
    } as unknown as DeclarativeTimerService;

    usecase = new ProcessGameCommandUseCase(
      sessionRepo,
      snapshotRepo,
      gameRegistry,
      timerService,
    );
  });

  it('should process initial command when no snapshot exists and create sequence 1', async () => {
    const result = await usecase.execute({
      sessionId: mockSession.id,
      gameId: 'axb',
      command: {
        type: 'VOTE',
        team: 'A',
        userId: 'user-1',
        timestamp: Date.now(),
      },
    });

    expect(result.snapshot?.sequence).toBe(1);
    expect((result.snapshot?.state as AxBState).score.teamA).toBe(1);
    expect((result.projection as AxBProjection).teamA.score).toBe(1);
    expect(snapshotRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: mockSession.id,
        sequence: 1,
      }),
    );
  });

  it('should process sequential commands monotonically incrementing sequence (0 -> 1 -> 2 -> 3)', async () => {
    // Command 1
    const res1 = await usecase.execute({
      sessionId: mockSession.id,
      gameId: 'axb',
      command: { type: 'VOTE', team: 'A', userId: 'user-1', timestamp: 1000 },
    });
    expect(res1.snapshot?.sequence).toBe(1);

    // Command 2
    const res2 = await usecase.execute({
      sessionId: mockSession.id,
      gameId: 'axb',
      command: { type: 'VOTE', team: 'B', userId: 'user-2', timestamp: 2000 },
    });
    expect(res2.snapshot?.sequence).toBe(2);

    // Command 3
    const res3 = await usecase.execute({
      sessionId: mockSession.id,
      gameId: 'axb',
      command: { type: 'VOTE', team: 'A', userId: 'user-3', timestamp: 3000 },
    });
    expect(res3.snapshot?.sequence).toBe(3);
    expect((res3.snapshot?.state as AxBState).score.teamA).toBe(2);
    expect((res3.snapshot?.state as AxBState).score.teamB).toBe(1);
  });

  it('should schedule timers when decision contains timerRequests (e.g. victory condition)', async () => {
    // Configure goal = 100 and send GIFT with 100 points to trigger victory & timer
    const winningSession = {
      ...mockSession,
      config: { ...DEFAULT_AXB_CONFIG, scoreGoal: 100 },
    };
    vi.mocked(sessionRepo.findById).mockResolvedValue(winningSession);

    const result = await usecase.execute({
      sessionId: mockSession.id,
      gameId: 'axb',
      command: {
        type: 'GIFT',
        team: 'A',
        pointsPerUnit: 100,
        resourceKey: 'tiktok:gift:5655',
        units: 1,
        timestamp: Date.now(),
      },
    });

    expect(result.decision?.roundEnded).toBe(true);
    expect(result.decision?.timerRequests?.length).toBeGreaterThan(0);
    expect(timerService.scheduleTimer).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: mockSession.id,
        gameId: 'axb',
        timer: expect.objectContaining({
          delayMs: DEFAULT_AXB_CONFIG.intervalDurationMs,
        }),
      }),
    );
  });

  it('should ignore command and return SESSION_ENDED when session is ENDED', async () => {
    const endedSession: GameSession = {
      ...mockSession,
      status: SessionStatus.ENDED,
      endedAt: new Date(),
    };
    vi.mocked(sessionRepo.findById).mockResolvedValueOnce(endedSession);

    const game = gameRegistry.getGame('axb');
    const applyCommandSpy = vi.spyOn(game.engine, 'applyCommand');

    const result = await usecase.execute({
      sessionId: mockSession.id,
      gameId: 'axb',
      command: { type: 'VOTE', team: 'A', userId: 'user-1' },
    });

    expect(result).toEqual({
      ignored: true,
      reason: 'SESSION_ENDED',
    });
    expect(applyCommandSpy).not.toHaveBeenCalled();
    expect(snapshotRepo.save).not.toHaveBeenCalled();
    expect(timerService.scheduleTimer).not.toHaveBeenCalled();

    applyCommandSpy.mockRestore();
  });

  it('should throw NotFoundError if session does not exist', async () => {
    vi.mocked(sessionRepo.findById).mockResolvedValueOnce(null);

    await expect(
      usecase.execute({
        sessionId: 'unknown-session',
        gameId: 'axb',
        command: { type: 'VOTE', team: 'A' },
      }),
    ).rejects.toThrow(NotFoundError);
  });
});
