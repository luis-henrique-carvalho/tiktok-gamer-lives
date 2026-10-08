import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { io as Client, type Socket as ClientSocket } from 'socket.io-client';
import { buildApp } from '../app.js';
import { runMigrations } from '../common/infrastructure/database/drizzle/migrate.js';
import { db } from '../common/infrastructure/database/drizzle/client.js';
import { DrizzleSessionRepository } from '../modules/sessions/infrastructure/database/drizzle/drizzle-session.repository.js';
import { DrizzleSnapshotRepository } from '../modules/sessions/infrastructure/database/drizzle/drizzle-snapshot.repository.js';
import {
  DEFAULT_AXB_CONFIG,
  type AxBProjection,
} from '../modules/games/axb/index.js';
import {
  SessionStatus,
  type GameSnapshot,
} from '../modules/sessions/domain/session.types.js';

describe('Realtime End-to-End & Worker Lifecycle (app.ts)', () => {
  let app: FastifyInstance;
  let serverUrl: string;
  let clientSocket: ClientSocket;
  let sessionRepo: DrizzleSessionRepository;
  let snapshotRepo: DrizzleSnapshotRepository;
  let sessionId: string;

  beforeAll(async () => {
    await runMigrations();
    sessionRepo = new DrizzleSessionRepository(db);
    snapshotRepo = new DrizzleSnapshotRepository(db);

    const created = await sessionRepo.create({
      title: 'Realtime E2E Test Session',
      gameId: 'axb',
      operatorId: randomUUID(),
      config: DEFAULT_AXB_CONFIG as unknown as Record<string, unknown>,
      status: SessionStatus.RUNNING,
    });
    sessionId = created.id;

    await snapshotRepo.save({
      sessionId,
      gameId: 'axb',
      sequence: 0,
      state: { score: { teamA: 0, teamB: 0 } },
      projection: {
        round: 1,
        teamA: { name: 'Time Vermelho', score: 0 },
        teamB: { name: 'Time Azul', score: 0 },
      },
    });

    app = await buildApp({ logger: false, startWorker: true });
    const address = await app.listen({ port: 0, host: '127.0.0.1' });
    serverUrl = address;
  });

  afterAll(async () => {
    clientSocket?.disconnect();
    await app?.close();
  });

  it('receives existing snapshot immediately when joining session room via Socket.IO', async () => {
    clientSocket = Client(serverUrl, {
      transports: ['websocket'],
      forceNew: true,
    });

    await new Promise<void>((resolve, reject) => {
      clientSocket.on('connect', () => resolve());
      clientSocket.on('connect_error', (err) => reject(err));
    });

    const snapshotPromise = new Promise<GameSnapshot>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Snapshot not received on join room')),
        2500,
      );
      clientSocket.on('snapshot', (snapshot: GameSnapshot) => {
        clearTimeout(timeout);
        resolve(snapshot);
      });
    });

    clientSocket.emit('join', `session:${sessionId}`);

    const received = await snapshotPromise;
    expect(received).toBeDefined();
    expect(received.sessionId).toBe(sessionId);
    expect(received.sequence).toBe(0);
    const proj = received.projection as AxBProjection;
    expect(proj.teamA.score).toBe(0);
  });

  it('processes enqueued command via BullMQ commandWorker and broadcasts updated snapshot', async () => {
    const updatedSnapshotPromise = new Promise<GameSnapshot>(
      (resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('Updated snapshot not received from worker')),
          4000,
        );
        clientSocket.on('snapshot', (snapshot: GameSnapshot) => {
          if (snapshot.sequence > 0) {
            clearTimeout(timeout);
            resolve(snapshot);
          }
        });
      },
    );

    // Trigger burst of 10 events via simulator endpoint
    const res = await app.inject({
      method: 'POST',
      url: '/api/simulator/burst',
      payload: {
        sessionId,
        totalEvents: 10,
        eventsPerSecond: 50,
      },
    });

    expect(res.statusCode).toBe(200);

    const updated = await updatedSnapshotPromise;
    expect(updated).toBeDefined();
    expect(updated.sequence).toBeGreaterThan(0);

    // Wait for the remaining burst events to finish processing before proceeding
    await new Promise((resolve) => setTimeout(resolve, 350));
  });

  it('stops simulator and discards residual commands when session is ended', async () => {
    // 1. Start continuous simulator
    const startSimRes = await app.inject({
      method: 'POST',
      url: '/api/simulator/start',
      payload: { sessionId, eventsPerSecond: 10 },
    });
    expect(startSimRes.statusCode).toBe(200);

    const simAdapter = (
      app as unknown as { simulatorAdapter: { isRunning: () => boolean } }
    ).simulatorAdapter;
    expect(simAdapter.isRunning()).toBe(true);

    // 2. End session via API
    const endRes = await app.inject({
      method: 'POST',
      url: `/api/sessions/${sessionId}/end`,
    });
    expect(endRes.statusCode).toBe(200);
    expect(endRes.json().status).toBe(SessionStatus.ENDED);

    // 3. Verify simulator was stopped by the onSessionEnded callback
    expect(simAdapter.isRunning()).toBe(false);

    // Wait for in-flight jobs from continuous simulator to finish before recording sequence
    await new Promise((resolve) => setTimeout(resolve, 150));

    // 4. Record snapshot sequence after end
    const snapBeforeResidual =
      await snapshotRepo.findLatestBySessionId(sessionId);
    const lastSequence = snapBeforeResidual?.sequence ?? 0;

    let receivedUnexpectedSnapshot = false;
    const unexpectedSnapshotListener = (snap: GameSnapshot) => {
      if (snap.sequence > lastSequence) {
        receivedUnexpectedSnapshot = true;
      }
    };
    clientSocket.on('snapshot', unexpectedSnapshotListener);

    // 5. Try triggering a burst of commands after session has ended
    await app.inject({
      method: 'POST',
      url: '/api/simulator/burst',
      payload: {
        sessionId,
        totalEvents: 5,
        eventsPerSecond: 50,
      },
    });

    // Wait 250ms for worker to process queued jobs
    await new Promise((resolve) => setTimeout(resolve, 250));

    clientSocket.off('snapshot', unexpectedSnapshotListener);

    // Verify snapshot sequence did not increase and no snapshot was broadcast
    const snapAfterResidual =
      await snapshotRepo.findLatestBySessionId(sessionId);
    expect(snapAfterResidual?.sequence).toBe(lastSequence);
    expect(receivedUnexpectedSnapshot).toBe(false);
  });
});
