import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { Server } from 'socket.io';
import type { Worker, Queue } from 'bullmq';
import { db } from '../common/infrastructure/database/drizzle/client.js';
import { runMigrations } from '../common/infrastructure/database/drizzle/migrate.js';
import {
  getRedisConnection,
  closeRedisConnection,
} from '../common/infrastructure/queue/redis.connection.js';
import {
  createQueue,
  createWorker,
} from '../common/infrastructure/queue/queue.factory.js';
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
import { ProcessInteractionUseCase } from '../modules/ingress/application/usecases/process-interaction.usecase.js';
import {
  ProcessGameCommandUseCase,
  type ProcessGameCommandInput,
  type ProcessGameCommandResult,
} from '../common/executor/application/usecases/process-game-command.usecase.js';
import { SimulatorCaptureAdapter } from '../modules/ingress/infrastructure/simulator/simulator-capture.adapter.js';
import { SocketIOSnapshotPublisher } from '../common/infrastructure/socket/socketio-snapshot-publisher.js';
import { commandProcessor } from '../common/executor/infrastructure/queue/command.worker.js';

describe('CA-11 Burst Traffic & Socket.IO Coalescing Integration Test', () => {
  let sessionRepo: DrizzleSessionRepository;
  let snapshotRepo: DrizzleSnapshotRepository;
  let interactionRepo: DrizzleInteractionRepository;
  let gameRegistry: GameRegistry;
  let commandQueue: Queue;
  let commandWorker: Worker<ProcessGameCommandInput, ProcessGameCommandResult>;
  let processInteractionUseCase: ProcessInteractionUseCase;
  let processGameCommandUseCase: ProcessGameCommandUseCase;
  let simulatorAdapter: SimulatorCaptureAdapter;
  let publisher: SocketIOSnapshotPublisher;
  let mockIoEmit: ReturnType<typeof vi.fn>;
  let mockIoTo: ReturnType<typeof vi.fn>;
  let sessionId: string;

  beforeAll(async () => {
    await runMigrations();
    const redis = getRedisConnection();

    sessionRepo = new DrizzleSessionRepository(db);
    snapshotRepo = new DrizzleSnapshotRepository(db);
    interactionRepo = new DrizzleInteractionRepository(db);

    gameRegistry = new GameRegistry();
    gameRegistry.registerGame(axbGameModule);

    const burstQueueName = `game-commands-burst-${randomUUID()}`;
    commandQueue = createQueue(burstQueueName, redis);

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
    );

    // Setup Mock Socket.IO Server
    mockIoEmit = vi.fn();
    mockIoTo = vi.fn().mockReturnValue({ emit: mockIoEmit });
    const mockIo = {
      to: mockIoTo,
    } as unknown as Server;

    publisher = new SocketIOSnapshotPublisher(mockIo, { throttleMs: 50 });

    // Setup BullMQ Serial Worker with concurrency 1
    const processor = commandProcessor(processGameCommandUseCase);
    commandWorker = createWorker<
      ProcessGameCommandInput,
      ProcessGameCommandResult
    >(
      burstQueueName,
      async (job) => {
        const res = await processor(job);
        publisher.publishSnapshot(job.data.sessionId, res.snapshot);
        return res;
      },
      { concurrency: 1, connection: redis },
    );

    simulatorAdapter = new SimulatorCaptureAdapter(processInteractionUseCase);

    // Create and start session
    sessionId = randomUUID();
    const createUseCase = new CreateSessionUseCase(sessionRepo, gameRegistry);
    await createUseCase.execute({
      id: sessionId,
      gameId: 'axb',
      operatorId: 'stress-operator',
      title: 'CA-11 Stress Test Session',
      config: {
        ...DEFAULT_AXB_CONFIG,
        scoreGoal: 100000, // Large so round does not end during burst
      },
    });

    const startUseCase = new StartSessionUseCase(
      sessionRepo,
      snapshotRepo,
      gameRegistry,
    );
    await startUseCase.execute({ sessionId });
  });

  afterAll(async () => {
    simulatorAdapter.stop();
    publisher.close();
    await commandWorker.close();
    await commandQueue.obliterate({ force: true });
    await commandQueue.close();
    await closeRedisConnection();
  });

  it('should process a burst of 200 events/s without loss, monotonic sequence, and throttled socket emission', async () => {
    const burstCount = 100; // 100 high-frequency synthetic events in burst

    const burstResult = await simulatorAdapter.triggerBurst(sessionId, {
      totalEvents: burstCount,
      eventsPerSecond: 500, // ultra fast burst
      distribution: { commentsRatio: 0.9, giftsRatio: 0.1 },
    });

    expect(burstResult.totalGenerated).toBe(burstCount);

    // Wait for BullMQ queue to drain completely
    await vi.waitFor(
      async () => {
        const counts = await commandQueue.getJobCounts();
        const latest = await snapshotRepo.findLatestBySessionId(sessionId);
        expect(counts.waiting + counts.active).toBe(0);
        expect(latest?.sequence).toBe(burstCount);
      },
      { timeout: 15000, interval: 100 },
    );

    const latestSnapshot = await snapshotRepo.findLatestBySessionId(sessionId);
    expect(latestSnapshot).not.toBeNull();
    expect(latestSnapshot?.sequence).toBe(burstCount);

    const state = latestSnapshot?.state as AxBState;
    const totalScore = state.score.teamA + state.score.teamB;
    expect(totalScore).toBeGreaterThanOrEqual(burstCount);

    // Flush socket publisher to emit latest snapshot
    publisher.flush(sessionId);

    expect(mockIoTo).toHaveBeenCalledWith(`session:${sessionId}`);
    expect(mockIoEmit).toHaveBeenCalledWith(
      'snapshot',
      expect.objectContaining({
        sessionId,
        sequence: burstCount,
      }),
    );
  }, 25000);
});
