import { eq, and, asc } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { InteractionRepository } from '../../../application/repositories/interaction.repository.js';
import type {
  StoredGameInteraction,
  CreateInteractionInput,
  InteractionStatus,
} from '../../../domain/session.types.js';
import { gameInteractions } from '../../../../../common/infrastructure/database/drizzle/schema.js';
import type { Database } from '../../../../../common/infrastructure/database/drizzle/client.js';

export class DrizzleInteractionRepository implements InteractionRepository {
  constructor(private readonly db: Database) {}

  async create(input: CreateInteractionInput): Promise<StoredGameInteraction> {
    const id = input.id ?? randomUUID();
    const now = input.createdAt ?? new Date();

    const [row] = await this.db
      .insert(gameInteractions)
      .values({
        id,
        sessionId: input.sessionId,
        idempotencyKey: input.idempotencyKey,
        type: input.type,
        source: input.source,
        userId: input.userId,
        userName: input.userName,
        payload: input.payload,
        status: input.status ?? 'PENDING',
        createdAt: now,
        processedAt: input.processedAt ?? null,
      })
      .returning();

    return this.mapToDomain(row);
  }

  async findByIdempotencyKey(
    key: string,
  ): Promise<StoredGameInteraction | null> {
    const [row] = await this.db
      .select()
      .from(gameInteractions)
      .where(eq(gameInteractions.idempotencyKey, key))
      .limit(1);

    if (!row) {
      return null;
    }
    return this.mapToDomain(row);
  }

  async findPendingBySessionId(
    sessionId: string,
  ): Promise<StoredGameInteraction[]> {
    const rows = await this.db
      .select()
      .from(gameInteractions)
      .where(
        and(
          eq(gameInteractions.sessionId, sessionId),
          eq(gameInteractions.status, 'PENDING'),
        ),
      )
      .orderBy(asc(gameInteractions.createdAt));

    return rows.map((r) => this.mapToDomain(r));
  }

  async updateStatus(
    id: string,
    status: InteractionStatus,
    processedAt?: Date | null,
  ): Promise<StoredGameInteraction | null> {
    const updateValues: {
      status: InteractionStatus;
      processedAt?: Date | null;
    } = {
      status,
    };

    if (processedAt !== undefined) {
      updateValues.processedAt = processedAt;
    }

    const [row] = await this.db
      .update(gameInteractions)
      .set(updateValues)
      .where(eq(gameInteractions.id, id))
      .returning();

    if (!row) {
      return null;
    }
    return this.mapToDomain(row);
  }

  private mapToDomain(
    row: typeof gameInteractions.$inferSelect,
  ): StoredGameInteraction {
    return {
      id: row.id,
      sessionId: row.sessionId,
      idempotencyKey: row.idempotencyKey,
      type: row.type,
      source: row.source,
      userId: row.userId,
      userName: row.userName,
      payload: row.payload as Record<string, unknown>,
      status: row.status as InteractionStatus,
      createdAt: row.createdAt,
      processedAt: row.processedAt,
    };
  }
}
