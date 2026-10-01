import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { db } from '../../../../../../common/infrastructure/database/drizzle/client.js';
import { runMigrations } from '../../../../../../common/infrastructure/database/drizzle/migrate.js';
import { DrizzleSessionRepository } from '../drizzle-session.repository.js';
import { SessionStatus } from '../../../../domain/session.types.js';

describe('DrizzleSessionRepository Integration', () => {
  let repository: DrizzleSessionRepository;

  beforeAll(async () => {
    await runMigrations();
    repository = new DrizzleSessionRepository(db);
  });

  afterAll(async () => {
    // Keep connection alive or don't terminate if shared with other tests
  });

  it('should create and retrieve a session by id', async () => {
    const sessionId = randomUUID();
    const created = await repository.create({
      id: sessionId,
      gameId: 'quiz-arena',
      operatorId: 'operator-123',
      title: 'Night Live Quiz',
      config: { roundTime: 30 },
    });

    expect(created.id).toBe(sessionId);
    expect(created.gameId).toBe('quiz-arena');
    expect(created.operatorId).toBe('operator-123');
    expect(created.title).toBe('Night Live Quiz');
    expect(created.status).toBe(SessionStatus.CONFIGURING);
    expect(created.config).toEqual({ roundTime: 30 });
    expect(created.createdAt).toBeInstanceOf(Date);

    const found = await repository.findById(sessionId);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(sessionId);
    expect(found?.title).toBe('Night Live Quiz');
  });

  it('should create a session with generated defaults when optional fields are omitted', async () => {
    const created = await repository.create({
      gameId: 'quiz-arena',
      operatorId: 'operator-default',
      title: 'Default Quiz',
    });

    expect(created.id).toBeDefined();
    expect(typeof created.id).toBe('string');
    expect(created.status).toBe(SessionStatus.CONFIGURING);
    expect(created.config).toEqual({});
    expect(created.createdAt).toBeInstanceOf(Date);
    expect(created.updatedAt).toBeInstanceOf(Date);

    const found = await repository.findById(created.id);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(created.id);
  });

  it('should return null when finding a non-existent session', async () => {
    const found = await repository.findById('non-existent-id');
    expect(found).toBeNull();
  });

  it('should find sessions by status', async () => {
    const sessionId = randomUUID();
    await repository.create({
      id: sessionId,
      gameId: 'guess-image',
      operatorId: 'op-456',
      title: 'Guessing Stream',
      status: SessionStatus.RUNNING,
    });

    const runningSessions = await repository.findByStatus(
      SessionStatus.RUNNING,
    );
    expect(runningSessions.some((s) => s.id === sessionId)).toBe(true);
  });

  it('should update session status and timestamps', async () => {
    const sessionId = randomUUID();
    await repository.create({
      id: sessionId,
      gameId: 'race-game',
      operatorId: 'op-789',
      title: 'Speed Race',
      status: SessionStatus.CONFIGURING,
    });

    // Update to RUNNING
    const running = await repository.updateStatus(
      sessionId,
      SessionStatus.RUNNING,
    );
    expect(running).not.toBeNull();
    expect(running?.status).toBe(SessionStatus.RUNNING);
    expect(running?.startedAt).toBeInstanceOf(Date);

    // Update to ENDED
    const endedAt = new Date();
    const ended = await repository.updateStatus(
      sessionId,
      SessionStatus.ENDED,
      endedAt,
    );
    expect(ended).not.toBeNull();
    expect(ended?.status).toBe(SessionStatus.ENDED);
    expect(ended?.endedAt?.getTime()).toBe(endedAt.getTime());
  });

  it('should return null when updating a non-existent session', async () => {
    const updated = await repository.updateStatus(
      'non-existent',
      SessionStatus.PAUSED,
    );
    expect(updated).toBeNull();
  });
});
