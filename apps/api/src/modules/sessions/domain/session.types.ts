export const SessionStatus = {
  CONFIGURING: 'CONFIGURING',
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  ENDED: 'ENDED',
} as const;

export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

export const InteractionStatus = {
  PENDING: 'PENDING',
  PROCESSED: 'PROCESSED',
  IGNORED: 'IGNORED',
  DUPLICATE: 'DUPLICATE',
} as const;

export type InteractionStatus =
  (typeof InteractionStatus)[keyof typeof InteractionStatus];

export interface GameSession {
  id: string;
  gameId: string;
  operatorId: string;
  status: SessionStatus;
  title: string;
  config: Record<string, unknown>;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSessionInput {
  id?: string;
  gameId: string;
  operatorId: string;
  title: string;
  config?: Record<string, unknown>;
  status?: SessionStatus;
}

export interface GameSnapshot {
  id: string;
  sessionId: string;
  gameId: string;
  sequence: number;
  state: unknown;
  projection: unknown;
  createdAt: Date;
}

export interface CreateSnapshotInput {
  id?: string;
  sessionId: string;
  gameId: string;
  sequence: number;
  state: unknown;
  projection: unknown;
  createdAt?: Date;
}

export interface StoredGameInteraction {
  id: string;
  sessionId: string;
  idempotencyKey: string;
  type: string;
  source: string;
  userId: string;
  userName: string;
  payload: Record<string, unknown>;
  status: InteractionStatus;
  createdAt: Date;
  processedAt: Date | null;
}

export interface CreateInteractionInput {
  id?: string;
  sessionId: string;
  idempotencyKey: string;
  type: string;
  source: string;
  userId: string;
  userName: string;
  payload: Record<string, unknown>;
  status?: InteractionStatus;
  createdAt?: Date;
  processedAt?: Date | null;
}
