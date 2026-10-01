import type {
  StoredGameInteraction,
  CreateInteractionInput,
  InteractionStatus,
} from '../../domain/session.types.js';

export interface InteractionRepository {
  create(interaction: CreateInteractionInput): Promise<StoredGameInteraction>;
  findByIdempotencyKey(key: string): Promise<StoredGameInteraction | null>;
  findPendingBySessionId(sessionId: string): Promise<StoredGameInteraction[]>;
  updateStatus(
    id: string,
    status: InteractionStatus,
    processedAt?: Date | null,
  ): Promise<StoredGameInteraction | null>;
}
