import type {
  DecisionResult,
  ExecutionContext,
  GameEngine,
  GameEvent,
  TimerRequest,
} from '../../../contracts/engine.js';
import { DEFAULT_AXB_CONFIG } from './constants.js';
import { AxBConfigSchema } from './schema.js';
import type {
  AxBCommand,
  AxBConfig,
  AxBGiftCommand,
  AxBRoundHistory,
  AxBState,
  AxBTeamId,
} from './types.js';

export function createInitialAxBState(_config?: AxBConfig): AxBState {
  return {
    currentRound: 1,
    roundStatus: 'ACTIVE',
    score: { teamA: 0, teamB: 0 },
    userCommentCooldowns: {},
    pendingContributions: [],
    history: [],
  };
}

export class AxBGameEngine implements GameEngine<
  AxBState,
  AxBConfig,
  AxBCommand
> {
  createInitialState(config?: AxBConfig): AxBState {
    return createInitialAxBState(config);
  }

  validateConfig(rawConfig: unknown): AxBConfig {
    return AxBConfigSchema.parse(rawConfig);
  }

  applyCommand(
    state: AxBState,
    command: AxBCommand,
    context: ExecutionContext,
    config: AxBConfig = DEFAULT_AXB_CONFIG,
  ): DecisionResult<AxBState> {
    const recovery = this.autoRecoverInterval(
      state,
      command.type,
      context,
      config,
    );
    const activeState = recovery.nextState;
    const autoAdvancedEvents = recovery.events;
    const autoAdvancedTimers = recovery.timerRequests;

    let result: DecisionResult<AxBState>;
    switch (command.type) {
      case 'VOTE':
        result = this.applyVote(activeState, command, context, config);
        break;
      case 'GIFT':
        result = this.applyGift(activeState, command, context, config);
        break;
      case 'RESUME':
        result = this.applyResume(activeState, context, config);
        break;
      case 'INTERVAL_EXPIRED':
        result = this.applyIntervalExpired(
          activeState,
          command,
          context,
          config,
        );
        break;
      case 'CLEAR_PENDING':
        result = {
          nextState: {
            ...activeState,
            pendingContributions: [],
          },
          status: 'APPLIED',
        };
        break;
      default:
        result = {
          nextState: activeState,
          status: 'IGNORED',
          reason: 'UNKNOWN_COMMAND',
        };
    }

    const mergedEvents = [...autoAdvancedEvents, ...(result.events ?? [])];
    const mergedTimers = [
      ...autoAdvancedTimers,
      ...(result.timerRequests ?? []),
    ];

    return {
      ...result,
      events: mergedEvents.length > 0 ? mergedEvents : undefined,
      timerRequests: mergedTimers.length > 0 ? mergedTimers : undefined,
    };
  }

  private autoRecoverInterval(
    state: AxBState,
    commandType: string,
    context: ExecutionContext,
    config: AxBConfig,
  ): {
    nextState: AxBState;
    events: GameEvent[];
    timerRequests: TimerRequest[];
  } {
    if (
      state.roundStatus !== 'INTERVAL' ||
      commandType === 'INTERVAL_EXPIRED'
    ) {
      return { nextState: state, events: [], timerRequests: [] };
    }

    const lastHistory =
      state.history && state.history.length > 0
        ? state.history[state.history.length - 1]
        : undefined;

    if (
      !lastHistory ||
      context.timestamp - lastHistory.completedAt < config.intervalDurationMs
    ) {
      return { nextState: state, events: [], timerRequests: [] };
    }

    const intervalResult = this.applyIntervalExpired(
      state,
      { type: 'INTERVAL_EXPIRED', timestamp: context.timestamp },
      context,
      config,
    );

    return {
      nextState: intervalResult.nextState,
      events: intervalResult.events ? [...intervalResult.events] : [],
      timerRequests: intervalResult.timerRequests
        ? [...intervalResult.timerRequests]
        : [],
    };
  }

  private applyVote(
    state: AxBState,
    command: AxBCommand & { type: 'VOTE' },
    context: ExecutionContext,
    config: AxBConfig,
  ): DecisionResult<AxBState> {
    // RG-03: Comments during pause are discarded
    if (context.isPaused) {
      return {
        nextState: state,
        status: 'IGNORED',
        reason: 'SESSION_PAUSED',
      };
    }

    // RG-03: Comments during interval are discarded
    if (state.roundStatus !== 'ACTIVE') {
      return {
        nextState: state,
        status: 'IGNORED',
        reason: 'ROUND_NOT_ACTIVE',
      };
    }

    // RG-02: User comment cooldown (5000ms shared between A and B)
    const lastVoteTimestamp = state.userCommentCooldowns[command.userId];
    if (
      lastVoteTimestamp !== undefined &&
      context.timestamp - lastVoteTimestamp < config.commentCooldownMs
    ) {
      return {
        nextState: state,
        status: 'IGNORED',
        reason: 'COOLDOWN_ACTIVE',
      };
    }

    const nextUserCooldowns: Record<string, number> = {
      ...state.userCommentCooldowns,
      [command.userId]: context.timestamp,
    };

    // RG-01: +1 point per vote
    const newScoreA = state.score.teamA + (command.team === 'A' ? 1 : 0);
    const newScoreB = state.score.teamB + (command.team === 'B' ? 1 : 0);

    return this.checkVictoryAndAdvance({
      state,
      newScoreA,
      newScoreB,
      nextUserCooldowns,
      context,
      config,
    });
  }

  private applyGift(
    state: AxBState,
    command: AxBGiftCommand,
    context: ExecutionContext,
    config: AxBConfig,
  ): DecisionResult<AxBState> {
    // Gift units have already been recognized and deduplicated by the core.
    // RG-08: Keep recognized contributions FIFO while paused or in the interval.
    if (context.isPaused || state.roundStatus !== 'ACTIVE') {
      const nextState: AxBState = {
        ...state,
        pendingContributions: [...state.pendingContributions, command],
      };

      return {
        nextState,
        status: 'DEFERRED',
        reason: context.isPaused ? 'SESSION_PAUSED' : 'ROUND_NOT_ACTIVE',
      };
    }

    // RG-04 & RG-05: Convert only the units recognized by the core into points.
    const earnedPoints = command.units * command.pointsPerUnit;
    const newScoreA =
      state.score.teamA + (command.team === 'A' ? earnedPoints : 0);
    const newScoreB =
      state.score.teamB + (command.team === 'B' ? earnedPoints : 0);

    return this.checkVictoryAndAdvance({
      state,
      newScoreA,
      newScoreB,
      nextUserCooldowns: state.userCommentCooldowns,
      context,
      config,
    });
  }

  private applyResume(
    state: AxBState,
    context: ExecutionContext,
    config: AxBConfig,
  ): DecisionResult<AxBState> {
    if (context.isPaused) {
      return { nextState: state, status: 'DEFERRED', reason: 'SESSION_PAUSED' };
    }

    if (state.roundStatus === 'INTERVAL') {
      const lastHistory =
        state.history && state.history.length > 0
          ? state.history[state.history.length - 1]
          : undefined;

      const elapsed = lastHistory
        ? context.timestamp - lastHistory.completedAt
        : config.intervalDurationMs;

      if (elapsed >= config.intervalDurationMs) {
        return this.applyIntervalExpired(
          state,
          { type: 'INTERVAL_EXPIRED', timestamp: context.timestamp },
          context,
          config,
        );
      } else {
        const remainingMs = Math.max(100, config.intervalDurationMs - elapsed);
        return {
          nextState: state,
          status: 'APPLIED',
          timerRequests: [
            {
              id: `interval-round-${state.currentRound}`,
              delayMs: remainingMs,
              type: 'INTERVAL_EXPIRED',
              payload: { round: state.currentRound },
            },
          ],
        };
      }
    }

    if (state.roundStatus !== 'ACTIVE') {
      return {
        nextState: state,
        status: 'IGNORED',
        reason: 'ROUND_NOT_ACTIVE',
      };
    }

    const { scoreA, scoreB, immediateWinner, victoryIndex } =
      this.evaluatePendingContributions(
        state.pendingContributions,
        config.scoreGoal,
        state.score,
      );

    if (immediateWinner === null) {
      return {
        nextState: {
          ...state,
          score: { teamA: scoreA, teamB: scoreB },
          pendingContributions: [],
        },
        status: 'APPLIED',
      };
    }

    const resumedState: AxBState = {
      ...state,
      pendingContributions: state.pendingContributions.slice(victoryIndex + 1),
    };

    return this.checkVictoryAndAdvance({
      state: resumedState,
      newScoreA: scoreA,
      newScoreB: scoreB,
      nextUserCooldowns: state.userCommentCooldowns,
      context,
      config,
    });
  }

  private applyIntervalExpired(
    state: AxBState,
    _command: AxBCommand & { type: 'INTERVAL_EXPIRED' },
    context: ExecutionContext,
    config: AxBConfig,
  ): DecisionResult<AxBState> {
    if (context.isPaused) {
      return {
        nextState: state,
        status: 'DEFERRED',
        reason: 'SESSION_PAUSED',
      };
    }

    if (state.roundStatus !== 'INTERVAL') {
      return {
        nextState: state,
        status: 'IGNORED',
        reason: 'ROUND_NOT_IN_INTERVAL',
      };
    }

    // RG-11: Start next round with score reset to 0, then apply pending in FIFO.
    const nextRoundNumber = state.currentRound + 1;
    const { scoreA, scoreB, immediateWinner, victoryIndex } =
      this.evaluatePendingContributions(
        state.pendingContributions,
        config.scoreGoal,
        { teamA: 0, teamB: 0 },
      );

    if (immediateWinner !== null) {
      return this.checkVictoryAndAdvance({
        state: {
          ...state,
          currentRound: nextRoundNumber,
          roundStatus: 'ACTIVE',
          score: { teamA: 0, teamB: 0 },
          pendingContributions: state.pendingContributions.slice(
            victoryIndex + 1,
          ),
        },
        newScoreA: scoreA,
        newScoreB: scoreB,
        nextUserCooldowns: state.userCommentCooldowns,
        context,
        config,
      });
    }

    const nextState: AxBState = {
      ...state,
      currentRound: nextRoundNumber,
      roundStatus: 'ACTIVE',
      score: { teamA: scoreA, teamB: scoreB },
      pendingContributions: [],
    };

    return {
      nextState,
      status: 'APPLIED',
    };
  }

  private evaluatePendingContributions(
    pendingContributions: readonly AxBGiftCommand[],
    scoreGoal: number,
    initialScore: { teamA: number; teamB: number },
  ): {
    scoreA: number;
    scoreB: number;
    immediateWinner: AxBTeamId | null;
    victoryIndex: number;
  } {
    let scoreA = initialScore.teamA;
    let scoreB = initialScore.teamB;
    let immediateWinner: AxBTeamId | null = null;
    let victoryIndex = -1;

    for (let i = 0; i < pendingContributions.length; i++) {
      const contribution = pendingContributions[i];
      const points = contribution.units * contribution.pointsPerUnit;
      if (contribution.team === 'A') {
        scoreA += points;
      } else {
        scoreB += points;
      }

      if (scoreA >= scoreGoal) {
        immediateWinner = 'A';
        victoryIndex = i;
        break;
      }

      if (scoreB >= scoreGoal) {
        immediateWinner = 'B';
        victoryIndex = i;
        break;
      }
    }

    return { scoreA, scoreB, immediateWinner, victoryIndex };
  }

  private checkVictoryAndAdvance(params: {
    state: AxBState;
    newScoreA: number;
    newScoreB: number;
    nextUserCooldowns: Readonly<Record<string, number>>;
    context: ExecutionContext;
    config: AxBConfig;
  }): DecisionResult<AxBState> {
    const { state, newScoreA, newScoreB, nextUserCooldowns, context, config } =
      params;

    // RG-09 & RG-10: First contribution reaching or exceeding scoreGoal defines winner
    const winner: AxBTeamId | null =
      newScoreA >= config.scoreGoal
        ? 'A'
        : newScoreB >= config.scoreGoal
          ? 'B'
          : null;

    if (winner !== null) {
      const roundHistory: AxBRoundHistory = {
        roundNumber: state.currentRound,
        winner,
        finalScore: { teamA: newScoreA, teamB: newScoreB },
        completedAt: context.timestamp,
      };

      const timerRequest: TimerRequest = {
        id: `interval-round-${state.currentRound}`,
        delayMs: config.intervalDurationMs,
        type: 'INTERVAL_EXPIRED',
        payload: { round: state.currentRound },
      };

      const event: GameEvent = {
        type: 'ROUND_WON',
        payload: {
          round: state.currentRound,
          winner,
          score: { teamA: newScoreA, teamB: newScoreB },
        },
        timestamp: context.timestamp,
      };

      const nextState: AxBState = {
        ...state,
        roundStatus: 'INTERVAL',
        score: { teamA: newScoreA, teamB: newScoreB },
        userCommentCooldowns: nextUserCooldowns,
        history: [...state.history, roundHistory],
      };

      return {
        nextState,
        status: 'APPLIED',
        roundEnded: true,
        winnerTeamId: winner,
        timerRequests: [timerRequest],
        events: [event],
      };
    }

    const nextState: AxBState = {
      ...state,
      score: { teamA: newScoreA, teamB: newScoreB },
      userCommentCooldowns: nextUserCooldowns,
    };

    return {
      nextState,
      status: 'APPLIED',
    };
  }
}
