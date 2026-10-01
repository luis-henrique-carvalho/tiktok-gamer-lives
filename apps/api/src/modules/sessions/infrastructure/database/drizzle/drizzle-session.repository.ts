import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { SessionRepository } from '../../../application/repositories/session.repository.js';
import type {
  GameSession,
  CreateSessionInput,
  SessionStatus,
} from '../../../domain/session.types.js';
import { gameSessions } from '../../../../../common/infrastructure/database/drizzle/schema.js';
import type { Database } from '../../../../../common/infrastructure/database/drizzle/client.js';

export class DrizzleSessionRepository implements SessionRepository {
  constructor(private readonly db: Database) {}

  async create(input: CreateSessionInput): Promise<GameSession> {
    const id = input.id ?? randomUUID();
    const now = new Date();
    const [row] = await this.db
      .insert(gameSessions)
      .values({
        id,
        gameId: input.gameId,
        operatorId: input.operatorId,
        title: input.title,
        status: input.status ?? 'CONFIGURING',
        config: input.config ?? {},
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapToDomain(row);
  }

  async findById(id: string): Promise<GameSession | null> {
    const [row] = await this.db
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.id, id))
      .limit(1);

    if (!row) {
      return null;
    }
    return this.mapToDomain(row);
  }

  async findByStatus(status: SessionStatus): Promise<GameSession[]> {
    const rows = await this.db
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.status, status));

    return rows.map((r) => this.mapToDomain(r));
  }

  async updateStatus(
    id: string,
    status: SessionStatus,
    endedAt?: Date,
  ): Promise<GameSession | null> {
    const updateValues: {
      status: SessionStatus;
      updatedAt: Date;
      endedAt?: Date;
      startedAt?: Date;
    } = {
      status,
      updatedAt: new Date(),
    };

    if (endedAt !== undefined) {
      updateValues.endedAt = endedAt;
    }
    if (status === 'RUNNING') {
      updateValues.startedAt = new Date();
    }

    const [row] = await this.db
      .update(gameSessions)
      .set(updateValues)
      .where(eq(gameSessions.id, id))
      .returning();

    if (!row) {
      return null;
    }
    return this.mapToDomain(row);
  }

  private mapToDomain(row: typeof gameSessions.$inferSelect): GameSession {
    return {
      id: row.id,
      gameId: row.gameId,
      operatorId: row.operatorId,
      status: row.status as SessionStatus,
      title: row.title,
      config: (row.config as Record<string, unknown>) ?? {},
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
