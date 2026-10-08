import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { db } from '../common/infrastructure/database/drizzle/client.js';
import { runMigrations } from '../common/infrastructure/database/drizzle/migrate.js';
import {
  getRedisConnection,
  closeRedisConnection,
} from '../common/infrastructure/queue/redis.connection.js';
import { createQueue } from '../common/infrastructure/queue/queue.factory.js';
import { DrizzleSessionRepository } from '../modules/sessions/infrastructure/database/drizzle/drizzle-session.repository.js';
import { DrizzleSnapshotRepository } from '../modules/sessions/infrastructure/database/drizzle/drizzle-snapshot.repository.js';
import { DrizzleInteractionRepository } from '../modules/sessions/infrastructure/database/drizzle/drizzle-interaction.repository.js';
import { GameRegistry } from '../common/registry/game-registry.js';
import {
  axbGameModule,
  DEFAULT_AXB_CONFIG,
  type AxBState,
} from '../modules/games/axb/index.js';
import { CreateSessionUseCase } from '../modules/sessions/application/usecases/create-session.usecase.js';
import { StartSessionUseCase } from '../modules/sessions/application/usecases/start-session.usecase.js';
import { PauseSessionUseCase } from '../modules/sessions/application/usecases/pause-session.usecase.js';
import { ResumeSessionUseCase } from '../modules/sessions/application/usecases/resume-session.usecase.js';
import { DeclarativeTimerService } from '../common/timers/declarative-timer.service.js';
import { ProcessInteractionUseCase } from '../modules/ingress/application/usecases/process-interaction.usecase.js';
import { ProcessGameCommandUseCase } from '../common/executor/application/usecases/process-game-command.usecase.js';
import type { CommentInteraction } from '../contracts/ingress.js';
import { SessionStatus } from '../modules/sessions/domain/session.types.js';

describe('Ingress & Serial FIFO Execution Integration Flow', () => {
  let sessionRepo: DrizzleSessionRepository;
  let snapshotRepo: DrizzleSnapshotRepository;
  let interactionRepo: DrizzleInteractionRepository;
  let gameRegistry: GameRegistry;
  let commandQueue: ReturnType<typeof createQueue>;
  let timerService: DeclarativeTimerService;
  let processInteractionUseCase: ProcessInteractionUseCase;
  let processGameCommandUseCase: ProcessGameCommandUseCase;
  let sessionId: string;

  beforeAll(async () => {
    await runMigrations();
    const redis = getRedisConnection();

    sessionRepo = new DrizzleSessionRepository(db);
    snapshotRepo = new DrizzleSnapshotRepository(db);
    interactionRepo = new DrizzleInteractionRepository(db);

    gameRegistry = new GameRegistry();
    gameRegistry.registerGame(axbGameModule);

    const ingressQueueName = `game-commands-ingress-${randomUUID()}`;
    commandQueue = createQueue(ingressQueueName, redis);
    timerService = new DeclarativeTimerService(commandQueue);

    processInteractionUseCase = new ProcessInteractionUseCase(
      redis,
      sessionRepo,
      interactionRepo,
      gameRegistry,
      commandQueue,
    );

    processGameCommandUseCase = new ProcessGameCommandUseCase(
      sessionRepo,
      snapshotRepo,
      gameRegistry,
      timerService,
    );

    // Create and start a test session
    sessionId = randomUUID();
    const createUseCase = new CreateSessionUseCase(sessionRepo, gameRegistry);
    await createUseCase.execute({
      id: sessionId,
      gameId: 'axb',
      operatorId: 'integration-op',
      title: 'Full Ingress & Execution Integration',
      config: { ...DEFAULT_AXB_CONFIG, scoreGoal: 100 },
    });

    const startUseCase = new StartSessionUseCase(
      sessionRepo,
      snapshotRepo,
      gameRegistry,
    );
    await startUseCase.execute({ sessionId });
  });

  afterAll(async () => {
    await commandQueue.obliterate({ force: true });
    await commandQueue.close();
    await closeRedisConnection();
  });

  it('1. Deduplication and Ingress: should reject duplicate interaction keys', async () => {
    const idempKey = `dedup-test-${randomUUID()}`;
    const comment: CommentInteraction = {
      id: idempKey,
      source: 'SIMULATOR',
      userId: 'user-alice',
      userName: 'Alice',
      type: 'comment',
      comment: 'A',
      timestamp: Date.now(),
    };

    const first = await processInteractionUseCase.execute({
      sessionId,
      interaction: comment,
      idempotencyKey: idempKey,
    });

    expect(first.status).toBe('PROCESSED');
    expect(first.command).toBeDefined();

    const second = await processInteractionUseCase.execute({
      sessionId,
      interaction: comment,
      idempotencyKey: idempKey,
    });

    expect(second.status).toBe('DUPLICATE');
    expect(second.duplicate).toBe(true);
  });

  it('2. Serial Execution & Monotonic Snapshots: sequential commands produce monotonically increasing sequence', async () => {
    const votes = ['A', 'B', 'A', 'B', 'A'];

    for (let i = 0; i < votes.length; i++) {
      const result = await processGameCommandUseCase.execute({
        sessionId,
        gameId: 'axb',
        command: {
          type: 'VOTE',
          team: votes[i],
          userId: `user-${i}`,
          timestamp: Date.now() + i * 10,
        },
      });

      expect(result.snapshot?.sequence).toBe(i + 1); // Started at 0 on startSession
    }

    const latest = await snapshotRepo.findLatestBySessionId(sessionId);
    expect(latest?.sequence).toBe(votes.length);
    expect((latest?.state as AxBState).score.teamA).toBe(3);
    expect((latest?.state as AxBState).score.teamB).toBe(2);
  });

  it('3. Declarative Timers: victory condition generates timer request and schedules delayed job', async () => {
    // Send massive gift to Team A to trigger scoreGoal (100) victory
    const result = await processGameCommandUseCase.execute({
      sessionId,
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
    expect(result.decision?.winnerTeamId).toBe('A');
    expect(result.decision?.timerRequests).toBeDefined();
    expect(result.decision?.timerRequests?.length).toBeGreaterThan(0);
  });

  it('4. Session Lifecycle & Pause / Resume FIFO Drain', async () => {
    const pauseUseCase = new PauseSessionUseCase(sessionRepo);
    await pauseUseCase.execute({ sessionId });

    const pausedSession = await sessionRepo.findById(sessionId);
    expect(pausedSession?.status).toBe(SessionStatus.PAUSED);

    // Send 2 interactions while session is paused
    const int1: CommentInteraction = {
      id: `paused-int-1-${randomUUID()}`,
      source: 'SIMULATOR',
      userId: 'user-p1',
      userName: 'Player 1',
      type: 'comment',
      comment: 'A',
      timestamp: Date.now(),
    };
    const int2: CommentInteraction = {
      id: `paused-int-2-${randomUUID()}`,
      source: 'SIMULATOR',
      userId: 'user-p2',
      userName: 'Player 2',
      type: 'comment',
      comment: 'B',
      timestamp: Date.now() + 50,
    };

    const res1 = await processInteractionUseCase.execute({
      sessionId,
      interaction: int1,
    });
    const res2 = await processInteractionUseCase.execute({
      sessionId,
      interaction: int2,
    });

    expect(res1.status).toBe('BUFFERED');
    expect(res1.pending).toBe(true);
    expect(res2.status).toBe('BUFFERED');
    expect(res2.pending).toBe(true);

    const pendingBeforeResume =
      await interactionRepo.findPendingBySessionId(sessionId);
    expect(pendingBeforeResume.length).toBeGreaterThanOrEqual(2);

    // Resume session: drains pending interactions in FIFO order
    const resumeUseCase = new ResumeSessionUseCase(
      sessionRepo,
      interactionRepo,
      gameRegistry,
      commandQueue,
    );
    const resumeResult = await resumeUseCase.execute({ sessionId });

    expect(resumeResult.session.status).toBe(SessionStatus.RUNNING);
    expect(resumeResult.drainedCount).toBeGreaterThanOrEqual(2);

    const pendingAfterResume =
      await interactionRepo.findPendingBySessionId(sessionId);
    expect(pendingAfterResume.length).toBe(0);
  });
});
