export type SessionStatus = 'PREPARED' | 'ACTIVE' | 'PAUSED' | 'ENDED';

export interface SessionState {
  readonly id: string;
  readonly gameId: string;
  readonly status: SessionStatus;
  readonly createdAt: number;
  readonly startedAt?: number;
  readonly endedAt?: number;
  readonly pausedAt?: number;
}

export interface SnapshotEnvelope<TProjection = unknown> {
  readonly sessionId: string;
  readonly gameId: string;
  readonly sequence: number;
  readonly timestamp: number;
  readonly projection: TProjection;
}
