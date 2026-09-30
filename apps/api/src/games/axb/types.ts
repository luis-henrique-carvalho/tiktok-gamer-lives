export type AxBTeamId = 'A' | 'B';

export interface AxBTeamConfig {
  readonly id: AxBTeamId;
  readonly name: string;
  readonly color: string;
}

export interface AxBGiftRule {
  readonly giftId: string;
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

export interface AxBVoteCommand {
  readonly type: 'VOTE';
  readonly team: AxBTeamId;
  readonly userId: string;
  readonly timestamp: number;
}

export interface AxBGiftCommand {
  readonly type: 'GIFT';
  readonly team: AxBTeamId;
  readonly pointsPerUnit: number;
  readonly giftId: string;
  readonly userId: string;
  readonly count: number;
  readonly comboKey?: string;
  readonly timestamp: number;
}

export interface AxBIntervalExpiredCommand {
  readonly type: 'INTERVAL_EXPIRED';
  readonly timestamp: number;
}

export type AxBCommand =
  AxBVoteCommand | AxBGiftCommand | AxBIntervalExpiredCommand;

export interface AxBState {
  readonly currentRound: number;
  readonly roundStatus: AxBRoundStatus;
  readonly score: AxBScore;
  readonly userCommentCooldowns: Readonly<Record<string, number>>;
  readonly activeCombos: Readonly<Record<string, number>>;
  readonly pendingContributions: readonly AxBCommand[];
  readonly history: readonly AxBRoundHistory[];
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
