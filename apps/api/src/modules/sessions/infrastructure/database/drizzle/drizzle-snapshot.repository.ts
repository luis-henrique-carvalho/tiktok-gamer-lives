import { eq, desc, and } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { SnapshotRepository } from '../../../application/repositories/snapshot.repository.js';
import type {
  GameSnapshot,
  CreateSnapshotInput,
} from '../../../domain/session.types.js';
import { gameSnapshots } from '../../../../../common/infrastructure/database/drizzle/schema.js';
import type { Database } from '../../../../../common/infrastructure/database/drizzle/client.js';

export class DrizzleSnapshotRepository implements SnapshotRepository {
  constructor(private readonly db: Database) {}

  async save(input: CreateSnapshotInput): Promise<GameSnapshot> {
    const id = input.id ?? randomUUID();
    const createdAt = input.createdAt ?? new Date();

    const [row] = await this.db
      .insert(gameSnapshots)
      .values({
        id,
        sessionId: input.sessionId,
        gameId: input.gameId,
        sequence: input.sequence,
        state: input.state,
        projection: input.projection,
        createdAt,
      })
      .returning();

    return this.mapToDomain(row);
  }

  async findLatestBySessionId(sessionId: string): Promise<GameSnapshot | null> {
    const [row] = await this.db
      .select()
      .from(gameSnapshots)
      .where(eq(gameSnapshots.sessionId, sessionId))
      .orderBy(desc(gameSnapshots.sequence))
      .limit(1);

    if (!row) {
      return null;
    }
    return this.mapToDomain(row);
  }

  async findBySessionAndSequence(
    sessionId: string,
    sequence: number,
  ): Promise<GameSnapshot | null> {
    const [row] = await this.db
      .select()
      .from(gameSnapshots)
      .where(
        and(
          eq(gameSnapshots.sessionId, sessionId),
          eq(gameSnapshots.sequence, sequence),
        ),
      )
      .limit(1);

    if (!row) {
      return null;
    }
    return this.mapToDomain(row);
  }

  private mapToDomain(row: typeof gameSnapshots.$inferSelect): GameSnapshot {
    return {
      id: row.id,
      sessionId: row.sessionId,
      gameId: row.gameId,
      sequence: row.sequence,
      state: row.state,
      projection: row.projection,
      createdAt: row.createdAt,
    };
  }
}
