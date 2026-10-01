import { describe, it, expect, beforeAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { db } from '../../../../../../common/infrastructure/database/drizzle/client.js';
import { runMigrations } from '../../../../../../common/infrastructure/database/drizzle/migrate.js';
import { DrizzleSessionRepository } from '../drizzle-session.repository.js';
import { DrizzleInteractionRepository } from '../drizzle-interaction.repository.js';
import { InteractionStatus } from '../../../../domain/session.types.js';

describe('DrizzleInteractionRepository Integration', () => {
  let sessionRepo: DrizzleSessionRepository;
  let interactionRepo: DrizzleInteractionRepository;
  let testSessionId: string;

  beforeAll(async () => {
    await runMigrations();
    sessionRepo = new DrizzleSessionRepository(db);
    interactionRepo = new DrizzleInteractionRepository(db);

    testSessionId = randomUUID();
    await sessionRepo.create({
      id: testSessionId,
      gameId: 'axb',
      operatorId: 'operator-test',
      title: 'Interaction Test Session',
    });
  });

  it('should create and retrieve interaction by idempotencyKey', async () => {
    const key = `key-${randomUUID()}`;
    const created = await interactionRepo.create({
      sessionId: testSessionId,
      idempotencyKey: key,
      type: 'comment',
      source: 'SIMULATOR',
      userId: 'user-1',
      userName: 'Alice',
      payload: { comment: 'Team A' },
    });

    expect(created.id).toBeDefined();
    expect(created.idempotencyKey).toBe(key);
    expect(created.status).toBe(InteractionStatus.PENDING);
    expect(created.createdAt).toBeInstanceOf(Date);

    const found = await interactionRepo.findByIdempotencyKey(key);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(created.id);
    expect(found?.userId).toBe('user-1');
  });

  it('should return null when finding by unknown idempotencyKey', async () => {
    const found = await interactionRepo.findByIdempotencyKey('unknown-key-999');
    expect(found).toBeNull();
  });

  it('should find pending interactions by sessionId ordered by createdAt ASC', async () => {
    const sId = randomUUID();
    await sessionRepo.create({
      id: sId,
      gameId: 'axb',
      operatorId: 'op-1',
      title: 'Pending Test',
    });

    const i1 = await interactionRepo.create({
      sessionId: sId,
      idempotencyKey: `pending-${randomUUID()}`,
      type: 'comment',
      source: 'SIMULATOR',
      userId: 'u1',
      userName: 'U1',
      payload: { text: 'first' },
      status: InteractionStatus.PENDING,
    });

    const i2 = await interactionRepo.create({
      sessionId: sId,
      idempotencyKey: `pending-${randomUUID()}`,
      type: 'comment',
      source: 'SIMULATOR',
      userId: 'u2',
      userName: 'U2',
      payload: { text: 'second' },
      status: InteractionStatus.PENDING,
    });

    // Create a PROCESSED one which shouldn't be in the pending list
    await interactionRepo.create({
      sessionId: sId,
      idempotencyKey: `processed-${randomUUID()}`,
      type: 'comment',
      source: 'SIMULATOR',
      userId: 'u3',
      userName: 'U3',
      payload: { text: 'third' },
      status: InteractionStatus.PROCESSED,
    });

    const pending = await interactionRepo.findPendingBySessionId(sId);
    expect(pending.length).toBe(2);
    expect(pending[0].id).toBe(i1.id);
    expect(pending[1].id).toBe(i2.id);
  });

  it('should update interaction status and processedAt timestamp', async () => {
    const key = `update-${randomUUID()}`;
    const created = await interactionRepo.create({
      sessionId: testSessionId,
      idempotencyKey: key,
      type: 'comment',
      source: 'SIMULATOR',
      userId: 'user-2',
      userName: 'Bob',
      payload: { comment: 'Team B' },
    });

    const processedAt = new Date();
    const updated = await interactionRepo.updateStatus(
      created.id,
      InteractionStatus.PROCESSED,
      processedAt,
    );

    expect(updated).not.toBeNull();
    expect(updated?.status).toBe(InteractionStatus.PROCESSED);
    expect(updated?.processedAt?.getTime()).toBe(processedAt.getTime());
  });

  it('should return null when updating non-existent interaction', async () => {
    const updated = await interactionRepo.updateStatus(
      'non-existent-interaction',
      InteractionStatus.PROCESSED,
    );
    expect(updated).toBeNull();
  });
});
