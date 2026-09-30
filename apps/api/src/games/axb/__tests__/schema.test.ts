import { describe, expect, it } from 'vitest';
import {
  AxBConfigSchema,
  AxBGiftRuleSchema,
  AxBTeamConfigSchema,
} from '../schema.js';
import { DEFAULT_AXB_CONFIG } from '../constants.js';
import { axbGameModule } from '../index.js';

describe('AxB Schema Validation (Zod)', () => {
  it('successfully validates default AxB configuration', () => {
    const result = AxBConfigSchema.safeParse(DEFAULT_AXB_CONFIG);
    expect(result.success).toBe(true);
  });

  it('rejects team config with empty name or color', () => {
    const invalidName = AxBTeamConfigSchema.safeParse({
      id: 'A',
      name: '   ',
      color: '#EF4444',
    });
    expect(invalidName.success).toBe(false);

    const invalidColor = AxBTeamConfigSchema.safeParse({
      id: 'B',
      name: 'Team B',
      color: '',
    });
    expect(invalidColor.success).toBe(false);
  });

  it('rejects config when teamA does not have id "A" or teamB does not have id "B"', () => {
    const invalidTeamA = AxBConfigSchema.safeParse({
      ...DEFAULT_AXB_CONFIG,
      teamA: { id: 'B', name: 'Time A', color: '#EF4444' },
    });
    expect(invalidTeamA.success).toBe(false);

    const invalidTeamB = AxBConfigSchema.safeParse({
      ...DEFAULT_AXB_CONFIG,
      teamB: { id: 'A', name: 'Time B', color: '#3B82F6' },
    });
    expect(invalidTeamB.success).toBe(false);
  });

  it('rejects invalid numeric values (scoreGoal <= 0, negative cooldowns)', () => {
    const zeroScoreGoal = AxBConfigSchema.safeParse({
      ...DEFAULT_AXB_CONFIG,
      scoreGoal: 0,
    });
    expect(zeroScoreGoal.success).toBe(false);

    const negativeCooldown = AxBConfigSchema.safeParse({
      ...DEFAULT_AXB_CONFIG,
      commentCooldownMs: -100,
    });
    expect(negativeCooldown.success).toBe(false);

    const negativeInterval = AxBConfigSchema.safeParse({
      ...DEFAULT_AXB_CONFIG,
      intervalDurationMs: -1,
    });
    expect(negativeInterval.success).toBe(false);
  });

  it('validates gift rules schema correctly', () => {
    const validRule = AxBGiftRuleSchema.safeParse({
      giftId: '5655',
      targetTeam: 'A',
      pointsPerUnit: 10,
    });
    expect(validRule.success).toBe(true);

    const invalidPoints = AxBGiftRuleSchema.safeParse({
      giftId: '5655',
      targetTeam: 'A',
      pointsPerUnit: 0,
    });
    expect(invalidPoints.success).toBe(false);

    const emptyGiftId = AxBGiftRuleSchema.safeParse({
      giftId: '  ',
      targetTeam: 'B',
      pointsPerUnit: 10,
    });
    expect(emptyGiftId.success).toBe(false);
  });

  it('enforces teamName length between 1 and 24 characters (PRD § 5)', () => {
    const valid24 = AxBTeamConfigSchema.safeParse({
      id: 'A',
      name: 'A'.repeat(24),
      color: '#EF4444',
    });
    expect(valid24.success).toBe(true);

    const invalid25 = AxBTeamConfigSchema.safeParse({
      id: 'A',
      name: 'A'.repeat(25),
      color: '#EF4444',
    });
    expect(invalid25.success).toBe(false);
  });

  it('enforces scoreGoal between 100 and 100,000 as an integer (PRD § 5)', () => {
    const minGoal = AxBConfigSchema.safeParse({
      ...DEFAULT_AXB_CONFIG,
      scoreGoal: 100,
    });
    expect(minGoal.success).toBe(true);

    const maxGoal = AxBConfigSchema.safeParse({
      ...DEFAULT_AXB_CONFIG,
      scoreGoal: 100_000,
    });
    expect(maxGoal.success).toBe(true);

    const belowMin = AxBConfigSchema.safeParse({
      ...DEFAULT_AXB_CONFIG,
      scoreGoal: 99,
    });
    expect(belowMin.success).toBe(false);

    const aboveMax = AxBConfigSchema.safeParse({
      ...DEFAULT_AXB_CONFIG,
      scoreGoal: 100_001,
    });
    expect(aboveMax.success).toBe(false);

    const nonInteger = AxBConfigSchema.safeParse({
      ...DEFAULT_AXB_CONFIG,
      scoreGoal: 150.5,
    });
    expect(nonInteger.success).toBe(false);
  });

  it('enforces giftRules maximum of 6 rules (PRD § 5)', () => {
    const sixRules = Array.from({ length: 6 }, (_, i) => ({
      giftId: `gift-${i}`,
      targetTeam: i % 2 === 0 ? ('A' as const) : ('B' as const),
      pointsPerUnit: 10,
    }));
    const validSix = AxBConfigSchema.safeParse({
      ...DEFAULT_AXB_CONFIG,
      giftRules: sixRules,
    });
    expect(validSix.success).toBe(true);

    const sevenRules = Array.from({ length: 7 }, (_, i) => ({
      giftId: `gift-${i}`,
      targetTeam: i % 2 === 0 ? ('A' as const) : ('B' as const),
      pointsPerUnit: 10,
    }));
    const invalidSeven = AxBConfigSchema.safeParse({
      ...DEFAULT_AXB_CONFIG,
      giftRules: sevenRules,
    });
    expect(invalidSeven.success).toBe(false);
  });

  it('validates config via axbGameModule.validateConfig delegation', () => {
    expect(typeof axbGameModule.validateConfig).toBe('function');
    const validated = axbGameModule.validateConfig!(DEFAULT_AXB_CONFIG);
    expect(validated).toEqual(DEFAULT_AXB_CONFIG);

    expect(() => {
      axbGameModule.validateConfig!({ invalid: true });
    }).toThrow();
  });
});
