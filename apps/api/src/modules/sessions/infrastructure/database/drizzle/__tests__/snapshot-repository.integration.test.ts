import { describe, it, expect, beforeAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { db } from '../../../../../../common/infrastructure/database/drizzle/client.js';
import { runMigrations } from '../../../../../../common/infrastructure/database/drizzle/migrate.js';
import { DrizzleSessionRepository } from '../drizzle-session.repository.js';
import { DrizzleSnapshotRepository } from '../drizzle-snapshot.repository.js';

describe('DrizzleSnapshotRepository Integration', () => {
  let sessionRepo: DrizzleSessionRepository;
  let snapshotRepo: DrizzleSnapshotRepository;
  let testSessionId: string;

  beforeAll(async () => {
    await runMigrations();
    sessionRepo = new DrizzleSessionRepository(db);
    snapshotRepo = new DrizzleSnapshotRepository(db);

    testSessionId = randomUUID();
    await sessionRepo.create({
      id: testSessionId,
      gameId: 'axb',
      operatorId: 'operator-test',
      title: 'Snapshot Test Session',
    });
  });

  it('should save and retrieve latest snapshot for a session', async () => {
    const snap1 = await snapshotRepo.save({
      sessionId: testSessionId,
      gameId: 'axb',
      sequence: 0,
      state: { round: 1, teamAScore: 0, teamBScore: 0 },
      projection: { round: 1, scoreA: 0, scoreB: 0 },
    });

    expect(snap1.id).toBeDefined();
    expect(snap1.sequence).toBe(0);

    const snap2 = await snapshotRepo.save({
      sessionId: testSessionId,
      gameId: 'axb',
      sequence: 1,
      state: { round: 1, teamAScore: 10, teamBScore: 0 },
      projection: { round: 1, scoreA: 10, scoreB: 0 },
    });

    expect(snap2.sequence).toBe(1);

    const latest = await snapshotRepo.findLatestBySessionId(testSessionId);
    expect(latest).not.toBeNull();
    expect(latest?.sequence).toBe(1);
    expect(latest?.state).toEqual({ round: 1, teamAScore: 10, teamBScore: 0 });
  });

  it('should find snapshot by session and specific sequence', async () => {
    const found = await snapshotRepo.findBySessionAndSequence(testSessionId, 0);
    expect(found).not.toBeNull();
    expect(found?.sequence).toBe(0);
    expect(found?.state).toEqual({ round: 1, teamAScore: 0, teamBScore: 0 });

    const nonExistent = await snapshotRepo.findBySessionAndSequence(
      testSessionId,
      999,
    );
    expect(nonExistent).toBeNull();
  });

  it('should return null when finding latest snapshot for session without snapshots', async () => {
    const emptySessionId = randomUUID();
    await sessionRepo.create({
      id: emptySessionId,
      gameId: 'axb',
      operatorId: 'operator-test-2',
      title: 'Empty Session',
    });

    const latest = await snapshotRepo.findLatestBySessionId(emptySessionId);
    expect(latest).toBeNull();
  });
});
