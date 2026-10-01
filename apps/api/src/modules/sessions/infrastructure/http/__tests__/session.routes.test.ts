import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import { errorHandler } from '../../../../../common/infrastructure/http/error-handler.js';
import { sessionRoutes } from '../routes/session.routes.js';
import { SessionController } from '../controllers/session.controller.js';
import type { CreateSessionUseCase } from '../../../application/usecases/create-session.usecase.js';
import type { StartSessionUseCase } from '../../../application/usecases/start-session.usecase.js';
import type { PauseSessionUseCase } from '../../../application/usecases/pause-session.usecase.js';
import type { ResumeSessionUseCase } from '../../../application/usecases/resume-session.usecase.js';
import type { EndSessionUseCase } from '../../../application/usecases/end-session.usecase.js';
import type { SessionRepository } from '../../../application/repositories/session.repository.js';
import type { SnapshotRepository } from '../../../application/repositories/snapshot.repository.js';
import type { InteractionRepository } from '../../../application/repositories/interaction.repository.js';
import {
  SessionStatus,
  type GameSession,
} from '../../../domain/session.types.js';

describe('Session HTTP Routes (/api/sessions)', () => {
  let app: FastifyInstance;
  let mockSessionRepo: SessionRepository;
  let mockSnapshotRepo: SnapshotRepository;
  let mockInteractionRepo: InteractionRepository;
  let mockCreateUseCase: CreateSessionUseCase;
  let mockStartUseCase: StartSessionUseCase;
  let mockPauseUseCase: PauseSessionUseCase;
  let mockResumeUseCase: ResumeSessionUseCase;
  let mockEndUseCase: EndSessionUseCase;
  let controller: SessionController;

  const sampleSession: GameSession = {
    id: '11111111-1111-1111-1111-111111111111',
    gameId: 'axb',
    operatorId: 'op-1',
    status: SessionStatus.CONFIGURING,
    title: 'Match 1',
    config: { test: true },
    startedAt: null,
    endedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockSessionRepo = {
      create: vi.fn(),
      findById: vi.fn(async (id) =>
        id === sampleSession.id ? sampleSession : null,
      ),
      findByStatus: vi.fn(async () => [sampleSession]),
      updateStatus: vi.fn(),
    };
    mockSnapshotRepo = {
      save: vi.fn(),
      findLatestBySessionId: vi.fn(async (id) => ({
        id: 'snap-1',
        sessionId: id,
        gameId: 'axb',
        sequence: 1,
        state: { score: 10 },
        projection: { total: 10 },
        createdAt: new Date(),
      })),
      findBySessionAndSequence: vi.fn(),
    };
    mockInteractionRepo = {
      create: vi.fn(),
      findByIdempotencyKey: vi.fn(),
      findPendingBySessionId: vi.fn(async () => []),
      updateStatus: vi.fn(),
    };

    mockCreateUseCase = {
      execute: vi.fn().mockResolvedValue(sampleSession),
    } as unknown as CreateSessionUseCase;

    mockStartUseCase = {
      execute: vi.fn().mockResolvedValue({
        ...sampleSession,
        status: SessionStatus.RUNNING,
        startedAt: new Date(),
      }),
    } as unknown as StartSessionUseCase;

    mockPauseUseCase = {
      execute: vi
        .fn()
        .mockResolvedValue({ ...sampleSession, status: SessionStatus.PAUSED }),
    } as unknown as PauseSessionUseCase;

    mockResumeUseCase = {
      execute: vi.fn().mockResolvedValue({
        session: { ...sampleSession, status: SessionStatus.RUNNING },
        drainedCount: 3,
      }),
    } as unknown as ResumeSessionUseCase;

    mockEndUseCase = {
      execute: vi.fn().mockResolvedValue({
        ...sampleSession,
        status: SessionStatus.ENDED,
        endedAt: new Date(),
      }),
    } as unknown as EndSessionUseCase;

    controller = new SessionController(
      mockSessionRepo,
      mockSnapshotRepo,
      mockInteractionRepo,
      mockCreateUseCase,
      mockStartUseCase,
      mockPauseUseCase,
      mockResumeUseCase,
      mockEndUseCase,
    );

    app = Fastify();
    app.setErrorHandler(errorHandler);
    await app.register(sessionRoutes(controller));
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /api/sessions - creates new session', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/sessions',
      payload: {
        gameId: 'axb',
        operatorId: 'op-1',
        title: 'Match 1',
        config: { test: true },
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: sampleSession.id,
        gameId: 'axb',
        status: 'CONFIGURING',
      }),
    );
    expect(mockCreateUseCase.execute).toHaveBeenCalled();
  });

  it('POST /api/sessions - returns 400 for invalid body', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/sessions',
      payload: {
        gameId: '', // invalid
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('GET /api/sessions/:id - returns session by id', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/sessions/${sampleSession.id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: sampleSession.id,
      }),
    );
  });

  it('GET /api/sessions/:id - returns 404 when not found', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/sessions/unknown-session-id',
    });

    expect(response.statusCode).toBe(404);
  });

  it('POST /api/sessions/:id/start - starts session', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/sessions/${sampleSession.id}/start`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        status: 'RUNNING',
      }),
    );
    expect(mockStartUseCase.execute).toHaveBeenCalledWith({
      sessionId: sampleSession.id,
    });
  });

  it('POST /api/sessions/:id/pause - pauses session', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/sessions/${sampleSession.id}/pause`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        status: 'PAUSED',
      }),
    );
    expect(mockPauseUseCase.execute).toHaveBeenCalledWith({
      sessionId: sampleSession.id,
    });
  });

  it('POST /api/sessions/:id/resume - resumes session', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/sessions/${sampleSession.id}/resume`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        session: expect.objectContaining({ status: 'RUNNING' }),
        drainedCount: 3,
      }),
    );
    expect(mockResumeUseCase.execute).toHaveBeenCalledWith({
      sessionId: sampleSession.id,
    });
  });

  it('POST /api/sessions/:id/end - ends session', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/sessions/${sampleSession.id}/end`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        status: 'ENDED',
      }),
    );
    expect(mockEndUseCase.execute).toHaveBeenCalledWith({
      sessionId: sampleSession.id,
    });
  });

  it('GET /api/sessions/:id/audit - exports session audit JSON', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/sessions/${sampleSession.id}/audit`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toEqual(
      expect.objectContaining({
        session: expect.objectContaining({ id: sampleSession.id }),
        latestSnapshot: expect.objectContaining({ sequence: 1 }),
        pendingInteractionsCount: 0,
      }),
    );
  });
});
