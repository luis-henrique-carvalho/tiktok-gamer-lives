import { describe, expect, it } from 'vitest';
import { AxBProjectionBuilder } from '../projection.js';
import { DEFAULT_AXB_CONFIG } from '../constants.js';
import { createInitialAxBState } from '../engine.js';
import type { AxBState } from '../types.js';
import type { ProjectionMeta } from '../../../../contracts/engine.js';

describe('AxBProjectionBuilder (TDD Red -> Green)', () => {
  const projection = new AxBProjectionBuilder();

  const defaultMeta: ProjectionMeta = {
    isPaused: false,
    pendingCount: 0,
  };

  it('projects initial state with 0 scores and 50/50 relative percentage', () => {
    const state = createInitialAxBState();
    const result = projection.project(state, DEFAULT_AXB_CONFIG, defaultMeta);

    expect(result.round).toBe(1);
    expect(result.roundStatus).toBe('ACTIVE');
    expect(result.scoreGoal).toBe(DEFAULT_AXB_CONFIG.scoreGoal);
    expect(result.isPaused).toBe(false);
    expect(result.pendingCount).toBe(0);
    expect(result.lastWinner).toBeNull();

    expect(result.teamA).toEqual({
      id: 'A',
      name: DEFAULT_AXB_CONFIG.teamA.name,
      color: DEFAULT_AXB_CONFIG.teamA.color,
      score: 0,
      wins: 0,
      progressPercentage: 0,
      relativePercentage: 50,
    });

    expect(result.teamB).toEqual({
      id: 'B',
      name: DEFAULT_AXB_CONFIG.teamB.name,
      color: DEFAULT_AXB_CONFIG.teamB.color,
      score: 0,
      wins: 0,
      progressPercentage: 0,
      relativePercentage: 50,
    });
  });

  it('projects active round with scores, progress percentages, and wins count', () => {
    const state: AxBState = {
      ...createInitialAxBState(),
      currentRound: 3,
      roundStatus: 'ACTIVE',
      score: { teamA: 750, teamB: 250 },
      history: [
        {
          roundNumber: 1,
          winner: 'A',
          finalScore: { teamA: 1000, teamB: 400 },
          completedAt: 10000,
        },
        {
          roundNumber: 2,
          winner: 'B',
          finalScore: { teamA: 300, teamB: 1010 },
          completedAt: 20000,
        },
      ],
      pendingContributions: [
        {
          type: 'GIFT',
          team: 'A',
          pointsPerUnit: 10,
          resourceKey: 'tiktok:gift:5655',
          units: 1,
          timestamp: 30000,
        },
      ],
    };

    const meta: ProjectionMeta = {
      isPaused: true,
      pendingCount: 1,
    };

    const result = projection.project(state, DEFAULT_AXB_CONFIG, meta);

    expect(result.round).toBe(3);
    expect(result.roundStatus).toBe('ACTIVE');
    expect(result.isPaused).toBe(true);
    expect(result.pendingCount).toBe(1);
    expect(result.lastWinner).toBe('B');

    // Total = 1000. Team A = 750 (75%), Team B = 250 (25%)
    expect(result.teamA.score).toBe(750);
    expect(result.teamA.wins).toBe(1);
    expect(result.teamA.progressPercentage).toBe(75);
    expect(result.teamA.relativePercentage).toBe(75);

    expect(result.teamB.score).toBe(250);
    expect(result.teamB.wins).toBe(1);
    expect(result.teamB.progressPercentage).toBe(25);
    expect(result.teamB.relativePercentage).toBe(25);
  });

  it('caps progressPercentage at 100 when score exceeds scoreGoal', () => {
    const state: AxBState = {
      ...createInitialAxBState(),
      score: { teamA: 1200, teamB: 400 },
    };

    const result = projection.project(state, DEFAULT_AXB_CONFIG, defaultMeta);
    expect(result.teamA.progressPercentage).toBe(100);
  });

  it('falls back to state.pendingContributions length if pendingCount in meta is undefined', () => {
    const state: AxBState = {
      ...createInitialAxBState(),
      pendingContributions: [
        {
          type: 'GIFT',
          team: 'A',
          pointsPerUnit: 10,
          resourceKey: 'tiktok:gift:5655',
          units: 1,
          timestamp: 30000,
        },
        {
          type: 'GIFT',
          team: 'B',
          pointsPerUnit: 10,
          resourceKey: 'tiktok:gift:5879',
          units: 2,
          timestamp: 30050,
        },
      ],
    };

    // Passing meta with pendingCount not provided
    const meta = { isPaused: false } as ProjectionMeta;
    const result = projection.project(state, DEFAULT_AXB_CONFIG, meta);

    expect(result.pendingCount).toBe(2);
  });

  it('handles scoreGoal <= 0 returning 0 progressPercentage', () => {
    const state: AxBState = {
      ...createInitialAxBState(),
      score: { teamA: 50, teamB: 50 },
    };

    const zeroGoalConfig = {
      ...DEFAULT_AXB_CONFIG,
      scoreGoal: 0,
    };

    const result = projection.project(state, zeroGoalConfig, defaultMeta);
    expect(result.teamA.progressPercentage).toBe(0);
    expect(result.teamB.progressPercentage).toBe(0);
  });

  it('handles empty meta falling back isPaused to false', () => {
    const state = createInitialAxBState();
    const emptyMeta = {} as ProjectionMeta;
    const result = projection.project(state, DEFAULT_AXB_CONFIG, emptyMeta);
    expect(result.isPaused).toBe(false);
  });
});
