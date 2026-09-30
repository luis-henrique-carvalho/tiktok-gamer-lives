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
    const winsA = state.history.filter((h) => h.winner === 'A').length;
    const winsB = state.history.filter((h) => h.winner === 'B').length;

    const totalScore = state.score.teamA + state.score.teamB;

    const relativePercentageA =
      totalScore > 0 ? Math.round((state.score.teamA / totalScore) * 100) : 50;
    const relativePercentageB =
      totalScore > 0 ? Math.round((state.score.teamB / totalScore) * 100) : 50;

    const progressPercentageA =
      config.scoreGoal > 0
        ? Math.min(
            100,
            Math.round((state.score.teamA / config.scoreGoal) * 100),
          )
        : 0;
    const progressPercentageB =
      config.scoreGoal > 0
        ? Math.min(
            100,
            Math.round((state.score.teamB / config.scoreGoal) * 100),
          )
        : 0;

    const teamA: AxBTeamProjection = {
      id: 'A',
      name: config.teamA.name,
      color: config.teamA.color,
      score: state.score.teamA,
      wins: winsA,
      progressPercentage: progressPercentageA,
      relativePercentage: relativePercentageA,
    };

    const teamB: AxBTeamProjection = {
      id: 'B',
      name: config.teamB.name,
      color: config.teamB.color,
      score: state.score.teamB,
      wins: winsB,
      progressPercentage: progressPercentageB,
      relativePercentage: relativePercentageB,
    };

    const lastWinner =
      state.history.length > 0
        ? state.history[state.history.length - 1].winner
        : null;

    const pendingCount =
      typeof meta?.pendingCount === 'number'
        ? meta.pendingCount
        : state.pendingContributions.length;

    return {
      round: state.currentRound,
      roundStatus: state.roundStatus,
      scoreGoal: config.scoreGoal,
      teamA,
      teamB,
      history: state.history,
      isPaused: meta?.isPaused ?? false,
      pendingCount,
      lastWinner,
    };
  }
}
