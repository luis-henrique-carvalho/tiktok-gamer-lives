import type {
  GameSession,
  CreateSessionInput,
  SessionStatus,
} from '../../domain/session.types.js';

export interface SessionRepository {
  create(input: CreateSessionInput): Promise<GameSession>;
  findById(id: string): Promise<GameSession | null>;
  findByStatus(status: SessionStatus): Promise<GameSession[]>;
  updateStatus(
    id: string,
    status: SessionStatus,
    endedAt?: Date,
  ): Promise<GameSession | null>;
}
