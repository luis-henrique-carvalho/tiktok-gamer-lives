import type {
  GameSnapshot,
  CreateSnapshotInput,
} from '../../domain/session.types.js';

export interface SnapshotRepository {
  save(snapshot: CreateSnapshotInput): Promise<GameSnapshot>;
  findLatestBySessionId(sessionId: string): Promise<GameSnapshot | null>;
  findBySessionAndSequence(
    sessionId: string,
    sequence: number,
  ): Promise<GameSnapshot | null>;
}
