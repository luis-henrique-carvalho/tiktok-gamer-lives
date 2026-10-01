import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from 'fastify';
import cors, { type FastifyCorsOptions } from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { Server as SocketIOServer } from 'socket.io';
import type { Queue } from 'bullmq';
import { errorHandler } from './common/infrastructure/http/error-handler.js';
import { healthRoutes } from './common/infrastructure/http/routes/health.routes.js';
import { authRoutes } from './modules/auth/infrastructure/http/routes/auth.routes.js';
import { sessionRoutes } from './modules/sessions/infrastructure/http/routes/session.routes.js';
import { simulatorRoutes } from './modules/ingress/infrastructure/http/routes/simulator.routes.js';
import { tiktokRoutes } from './modules/ingress/infrastructure/http/routes/tiktok.routes.js';

import {
  SocketIOSnapshotPublisher,
  type SnapshotPublisher,
} from './common/infrastructure/socket/socketio-snapshot-publisher.js';
import { SessionController } from './modules/sessions/infrastructure/http/controllers/session.controller.js';
import { SimulatorController } from './modules/ingress/infrastructure/http/controllers/simulator.controller.js';
import { TikTokController } from './modules/ingress/infrastructure/http/controllers/tiktok.controller.js';
import { SimulatorCaptureAdapter } from './modules/ingress/infrastructure/simulator/simulator-capture.adapter.js';
import { TikTokLiveCaptureAdapter } from './modules/ingress/infrastructure/tiktok/tiktok-capture.adapter.js';

import { db } from './common/infrastructure/database/drizzle/client.js';
import { getRedisConnection } from './common/infrastructure/queue/redis.connection.js';
import { createQueue } from './common/infrastructure/queue/queue.factory.js';
import { QUEUE_NAMES } from './common/infrastructure/queue/queue.constants.js';
import { GameRegistry } from './common/registry/game-registry.js';
import { axbGameModule } from './modules/games/axb/index.js';

import { DrizzleSessionRepository } from './modules/sessions/infrastructure/database/drizzle/drizzle-session.repository.js';
import { DrizzleSnapshotRepository } from './modules/sessions/infrastructure/database/drizzle/drizzle-snapshot.repository.js';
import { DrizzleInteractionRepository } from './modules/sessions/infrastructure/database/drizzle/drizzle-interaction.repository.js';

import { CreateSessionUseCase } from './modules/sessions/application/usecases/create-session.usecase.js';
import { StartSessionUseCase } from './modules/sessions/application/usecases/start-session.usecase.js';
import { PauseSessionUseCase } from './modules/sessions/application/usecases/pause-session.usecase.js';
import { ResumeSessionUseCase } from './modules/sessions/application/usecases/resume-session.usecase.js';
import { EndSessionUseCase } from './modules/sessions/application/usecases/end-session.usecase.js';
import { ProcessInteractionUseCase } from './modules/ingress/application/usecases/process-interaction.usecase.js';

export interface AppOptions extends FastifyServerOptions {
  corsOrigin?: FastifyCorsOptions['origin'];
  sessionController?: SessionController;
  simulatorController?: SimulatorController;
  tiktokController?: TikTokController;
  simulatorAdapter?: SimulatorCaptureAdapter;
  tiktokAdapter?: TikTokLiveCaptureAdapter;
  publisher?: SnapshotPublisher;
  io?: SocketIOServer;
}

interface AppComponents {
  sessionController: SessionController;
  simulatorController: SimulatorController;
  tiktokController: TikTokController;
  simulatorAdapter: SimulatorCaptureAdapter;
  tiktokAdapter: TikTokLiveCaptureAdapter;
  publisher: SnapshotPublisher;
  io: SocketIOServer;
}

function createComponents(
  app: FastifyInstance,
  options: AppOptions,
): AppComponents {
  const socketCorsOrigin =
    typeof options.corsOrigin === 'string' ||
    Array.isArray(options.corsOrigin) ||
    typeof options.corsOrigin === 'boolean'
      ? (options.corsOrigin as string | string[] | boolean)
      : '*';

  const io =
    options.io ??
    new SocketIOServer(app.server, {
      cors: { origin: socketCorsOrigin, methods: ['GET', 'POST'] },
    });

  const publisher =
    options.publisher ?? new SocketIOSnapshotPublisher(io, { throttleMs: 50 });

  const gameRegistry = new GameRegistry();
  gameRegistry.registerGame(axbGameModule);

  const sessionRepo = new DrizzleSessionRepository(db);
  const snapshotRepo = new DrizzleSnapshotRepository(db);
  const interactionRepo = new DrizzleInteractionRepository(db);

  let commandQueue: Queue | null = null;
  let processUseCase: ProcessInteractionUseCase | null = null;

  try {
    const redis = getRedisConnection();
    commandQueue = createQueue(QUEUE_NAMES.GAME_COMMANDS, redis);
    processUseCase = new ProcessInteractionUseCase(
      redis,
      sessionRepo,
      interactionRepo,
      gameRegistry,
      commandQueue,
    );
  } catch {
    // Redis might be unavailable in offline unit tests
  }

  const sessionCtrl =
    options.sessionController ??
    new SessionController(
      sessionRepo,
      snapshotRepo,
      interactionRepo,
      new CreateSessionUseCase(sessionRepo, gameRegistry),
      new StartSessionUseCase(sessionRepo, snapshotRepo, gameRegistry),
      new PauseSessionUseCase(sessionRepo),
      new ResumeSessionUseCase(
        sessionRepo,
        interactionRepo,
        gameRegistry,
        (commandQueue ?? {}) as unknown as Queue,
      ),
      new EndSessionUseCase(sessionRepo),
    );

  const simAdapter =
    options.simulatorAdapter ??
    (processUseCase
      ? new SimulatorCaptureAdapter(processUseCase)
      : ({} as SimulatorCaptureAdapter));

  const ttAdapter =
    options.tiktokAdapter ??
    (processUseCase
      ? new TikTokLiveCaptureAdapter(processUseCase, undefined, publisher)
      : ({} as TikTokLiveCaptureAdapter));

  return {
    sessionController: sessionCtrl,
    simulatorController:
      options.simulatorController ?? new SimulatorController(simAdapter),
    tiktokController:
      options.tiktokController ?? new TikTokController(ttAdapter),
    simulatorAdapter: simAdapter,
    tiktokAdapter: ttAdapter,
    publisher,
    io,
  };
}

export async function buildApp(
  options: AppOptions = {},
): Promise<FastifyInstance> {
  const { corsOrigin = '*', ...fastifyOptions } = options;
  const app = Fastify(fastifyOptions);

  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler((_req, reply) => {
    return reply.status(404).send({ status: 404, message: 'Route not found' });
  });

  await app.register(cors, { origin: corsOrigin });
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'TikTok Gamer Lives API',
        version: '0.1.0',
        description:
          'Interactive live streaming platform API for TikTok Live interactive gaming',
      },
    },
  });
  await app.register(swaggerUi, { routePrefix: '/api/docs' });

  const comp = createComponents(app, options);

  app.decorate('io', comp.io);
  app.decorate('publisher', comp.publisher);
  app.decorate('simulatorAdapter', comp.simulatorAdapter);
  app.decorate('tiktokAdapter', comp.tiktokAdapter);

  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(sessionRoutes(comp.sessionController));
  await app.register(simulatorRoutes(comp.simulatorController));
  await app.register(tiktokRoutes(comp.tiktokController));

  app.addHook('onClose', async () => {
    comp.publisher.close();
    if (!options.io) {
      await new Promise<void>((resolve) => {
        comp.io.close(() => resolve());
      });
    }
  });

  return app;
}
