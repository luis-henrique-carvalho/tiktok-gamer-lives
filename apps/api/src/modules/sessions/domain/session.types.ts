export const SessionStatus = {
  CONFIGURING: 'CONFIGURING',
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  ENDED: 'ENDED',
} as const;

export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

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
