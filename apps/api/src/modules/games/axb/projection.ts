import type {
  GameProjection,
  ProjectionMeta,
} from '../../../contracts/engine.js';
import type {
  AxBConfig,
  AxBProjection,
  AxBState,
  AxBTeamProjection,
} from './types.js';

export class AxBProjectionBuilder implements GameProjection<
  AxBState,
  AxBConfig,
  AxBProjection
> {
  project(
    state: AxBState,
    config: AxBConfig,
    meta: ProjectionMeta,
  ): AxBProjection {
    const history = state.history ?? [];
    const scoreA = state.score?.teamA ?? 0;
    const scoreB = state.score?.teamB ?? 0;

    const winsA = history.filter((h) => h.winner === 'A').length;
    const winsB = history.filter((h) => h.winner === 'B').length;

    const totalScore = scoreA + scoreB;

    const relativePercentageA =
      totalScore > 0 ? Math.round((scoreA / totalScore) * 100) : 50;
    const relativePercentageB =
      totalScore > 0 ? Math.round((scoreB / totalScore) * 100) : 50;

    const progressPercentageA =
      config.scoreGoal > 0
        ? Math.min(100, Math.round((scoreA / config.scoreGoal) * 100))
        : 0;
    const progressPercentageB =
      config.scoreGoal > 0
        ? Math.min(100, Math.round((scoreB / config.scoreGoal) * 100))
        : 0;

    const teamA: AxBTeamProjection = {
      id: 'A',
      name: config.teamA.name,
      color: config.teamA.color,
      score: scoreA,
      wins: winsA,
      progressPercentage: progressPercentageA,
      relativePercentage: relativePercentageA,
    };

    const teamB: AxBTeamProjection = {
      id: 'B',
      name: config.teamB.name,
      color: config.teamB.color,
      score: scoreB,
      wins: winsB,
      progressPercentage: progressPercentageB,
      relativePercentage: relativePercentageB,
    };

    const lastWinner =
      history.length > 0 ? history[history.length - 1].winner : null;

    const pendingCount =
      typeof meta?.pendingCount === 'number'
        ? meta.pendingCount
        : (state.pendingContributions ?? []).length;

    return {
      round: state.currentRound ?? 1,
      roundStatus: state.roundStatus ?? 'ACTIVE',
      scoreGoal: config.scoreGoal,
      teamA,
      teamB,
      history,
      isPaused: meta?.isPaused ?? false,
      pendingCount,
      lastWinner,
    };
  }
}
