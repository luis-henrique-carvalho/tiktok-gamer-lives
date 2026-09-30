import type { AxBConfig, AxBGiftRule, AxBTeamConfig } from './types.js';

export const DEFAULT_SCORE_GOAL = 1000;
export const DEFAULT_COMMENT_COOLDOWN_MS = 5000;
export const DEFAULT_INTERVAL_DURATION_MS = 5000;

export const DEFAULT_TEAM_A: AxBTeamConfig = {
  id: 'A',
  name: 'Time A',
  color: '#EF4444',
};

export const DEFAULT_TEAM_B: AxBTeamConfig = {
  id: 'B',
  name: 'Time B',
  color: '#3B82F6',
};

export const MVP_GIFT_RULES: readonly AxBGiftRule[] = [
  { giftId: '5655', targetTeam: 'A', pointsPerUnit: 10 },
  { giftId: '5879', targetTeam: 'B', pointsPerUnit: 10 },
  { giftId: '5827', targetTeam: 'A', pointsPerUnit: 50 },
  { giftId: '6064', targetTeam: 'B', pointsPerUnit: 50 },
];

export const DEFAULT_AXB_CONFIG: AxBConfig = {
  teamA: DEFAULT_TEAM_A,
  teamB: DEFAULT_TEAM_B,
  scoreGoal: DEFAULT_SCORE_GOAL,
  commentCooldownMs: DEFAULT_COMMENT_COOLDOWN_MS,
  intervalDurationMs: DEFAULT_INTERVAL_DURATION_MS,
  giftRules: MVP_GIFT_RULES,
};
