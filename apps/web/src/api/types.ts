export type SessionStatus = 'CONFIGURING' | 'RUNNING' | 'PAUSED' | 'ENDED';

export type AxBTeamId = 'A' | 'B';

export interface AxBTeamConfig {
  readonly id: AxBTeamId;
  readonly name: string;
  readonly color: string;
}

export interface AxBGiftRule {
  readonly resourceKey: string;
  readonly targetTeam: AxBTeamId;
  readonly pointsPerUnit: number;
}

export interface AxBConfig {
  readonly teamA: AxBTeamConfig;
  readonly teamB: AxBTeamConfig;
  readonly scoreGoal: number;
  readonly commentCooldownMs: number;
  readonly intervalDurationMs: number;
  readonly giftRules: readonly AxBGiftRule[];
}

export type AxBRoundStatus = 'ACTIVE' | 'INTERVAL' | 'ENDED';

export interface AxBScore {
  readonly teamA: number;
  readonly teamB: number;
}

export interface AxBRoundHistory {
  readonly roundNumber: number;
  readonly winner: AxBTeamId;
  readonly finalScore: AxBScore;
  readonly completedAt: number;
}

export interface AxBTeamProjection {
  readonly id: AxBTeamId;
  readonly name: string;
  readonly color: string;
  readonly score: number;
  readonly wins: number;
  readonly progressPercentage: number;
  readonly relativePercentage: number;
}

export interface AxBProjection {
  readonly round: number;
  readonly roundStatus: AxBRoundStatus;
  readonly scoreGoal: number;
  readonly teamA: AxBTeamProjection;
  readonly teamB: AxBTeamProjection;
  readonly history: readonly AxBRoundHistory[];
  readonly isPaused: boolean;
  readonly pendingCount: number;
  readonly lastWinner: AxBTeamId | null;
}

export interface GameSession {
  readonly id: string;
  readonly gameId: string;
  readonly operatorId: string;
  readonly status: SessionStatus;
  readonly title: string;
  readonly config: AxBConfig | Record<string, unknown>;
  readonly startedAt: string | null;
  readonly endedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateSessionRequest {
  readonly gameId: string;
  readonly operatorId: string;
  readonly title: string;
  readonly config?: Partial<AxBConfig> | Record<string, unknown>;
}

export interface ResumeSessionResponse {
  readonly session: GameSession;
  readonly drainedCount: number;
}

export interface GameSnapshot {
  readonly id?: string;
  readonly sessionId: string;
  readonly gameId: string;
  readonly sequence: number;
  readonly state?: unknown;
  readonly projection: AxBProjection;
  readonly createdAt?: string | Date;
}

export interface AuditSessionResponse {
  readonly session: GameSession;
  readonly latestSnapshot: GameSnapshot | null;
  readonly pendingInteractionsCount: number;
  readonly pendingInteractions: readonly Record<string, unknown>[];
}

export interface ContributionAlert {
  readonly id?: string;
  readonly userId: string;
  readonly userName: string;
  readonly resourceKey: string;
  readonly units: number;
  readonly timestamp: number;
}

export interface TikTokConnectRequest {
  readonly username: string;
  readonly sessionId: string;
}

export interface TikTokStatusResponse {
  readonly status: 'connected' | 'disconnected' | 'connecting' | string;
  readonly username: string | null;
  readonly sessionId: string | null;
}

export interface SimulatorStartRequest {
  readonly sessionId: string;
  readonly eventsPerSecond?: number;
  readonly distribution?: {
    readonly commentsRatio?: number;
    readonly giftsRatio?: number;
  };
}

export interface SimulatorStartResponse {
  readonly status: string;
  readonly sessionId: string;
  readonly eventsPerSecond: number;
}

export interface SimulatorStopResponse {
  readonly status: string;
}

export interface SimulatorBurstRequest {
  readonly sessionId: string;
  readonly totalEvents?: number;
  readonly eventsPerSecond?: number;
  readonly distribution?: {
    readonly commentsRatio?: number;
    readonly giftsRatio?: number;
  };
}

export interface SimulatorBurstResponse {
  readonly status: string;
  readonly sessionId: string;
  readonly totalGenerated: number;
}

export interface LogEvent {
  readonly id: string;
  readonly timestamp: number;
  readonly type: 'gift' | 'comment' | 'like' | 'alert' | 'system';
  readonly text: string;
  readonly details?: Record<string, unknown>;
}

export interface MetricsState {
  readonly eventsCount: number;
  readonly eventsPerSecond: number;
  readonly snapshotsPerSecond: number;
  readonly latencyMs: number;
  readonly sequence: number;
}
