import type {
  DecisionResult,
  ExecutionContext,
  GameEngine,
  GameEvent,
  TimerRequest,
} from '../../contracts/engine.js';
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
    activeCombos: {},
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
    switch (command.type) {
      case 'VOTE':
        return this.applyVote(state, command, context, config);
      case 'GIFT':
        return this.applyGift(state, command, context, config);
      case 'INTERVAL_EXPIRED':
        return this.applyIntervalExpired(state, command, context, config);
      default:
        return {
          nextState: state,
          status: 'IGNORED',
          reason: 'UNKNOWN_COMMAND',
        };
    }
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
      nextActiveCombos: state.activeCombos,
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
    const comboKey = command.comboKey ?? `${command.userId}:${command.giftId}`;
    const lastRecognizedCount = state.activeCombos[comboKey] ?? 0;

    // RG-05: Only recognize strictly positive delta from cumulative combos
    const deltaUnits = command.count - lastRecognizedCount;
    if (deltaUnits <= 0) {
      return {
        nextState: state,
        status: 'IGNORED',
        reason: 'DUPLICATE_OR_OLD_COMBO_COUNT',
      };
    }

    const nextActiveCombos: Record<string, number> = {
      ...state.activeCombos,
      [comboKey]: command.count,
    };

    // RG-08: Mapped gifts received during pause or interval are enqueued in pendingContributions
    if (context.isPaused || state.roundStatus !== 'ACTIVE') {
      const pendingCmd: AxBGiftCommand = {
        ...command,
        count: deltaUnits,
        comboKey: undefined,
      };

      const nextPending = [...state.pendingContributions, pendingCmd];
      const nextState: AxBState = {
        ...state,
        activeCombos: nextActiveCombos,
        pendingContributions: nextPending,
      };

      return {
        nextState,
        status: 'DEFERRED',
        reason: context.isPaused ? 'SESSION_PAUSED' : 'ROUND_NOT_ACTIVE',
      };
    }

    // RG-04 & RG-05: In active round, points = deltaUnits * pointsPerUnit
    const earnedPoints = deltaUnits * command.pointsPerUnit;
    const newScoreA =
      state.score.teamA + (command.team === 'A' ? earnedPoints : 0);
    const newScoreB =
      state.score.teamB + (command.team === 'B' ? earnedPoints : 0);

    return this.checkVictoryAndAdvance({
      state,
      newScoreA,
      newScoreB,
      nextUserCooldowns: state.userCommentCooldowns,
      nextActiveCombos,
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

    // RG-11: Start next round with score reset to 0
    const nextRoundNumber = state.currentRound + 1;

    // RG-12: Apply pending contributions in FIFO order
    const { scoreA, scoreB, immediateWinner, victoryIndex } =
      this.evaluatePendingContributions(
        state.pendingContributions,
        config.scoreGoal,
      );

    // RG-12: If pending contribution caused victory, finish immediately and preserve remaining pending
    if (immediateWinner !== null) {
      const remainingPending = state.pendingContributions.slice(
        victoryIndex + 1,
      );

      const roundHistory: AxBRoundHistory = {
        roundNumber: nextRoundNumber,
        winner: immediateWinner,
        finalScore: { teamA: scoreA, teamB: scoreB },
        completedAt: context.timestamp,
      };

      const timerRequest: TimerRequest = {
        id: `interval-round-${nextRoundNumber}`,
        delayMs: config.intervalDurationMs,
        type: 'INTERVAL_EXPIRED',
        payload: { round: nextRoundNumber },
      };

      const event: GameEvent = {
        type: 'ROUND_WON',
        payload: {
          round: nextRoundNumber,
          winner: immediateWinner,
          score: { teamA: scoreA, teamB: scoreB },
        },
        timestamp: context.timestamp,
      };

      const nextState: AxBState = {
        ...state,
        currentRound: nextRoundNumber,
        roundStatus: 'INTERVAL',
        score: { teamA: scoreA, teamB: scoreB },
        pendingContributions: remainingPending,
        history: [...state.history, roundHistory],
      };

      return {
        nextState,
        status: 'APPLIED',
        roundEnded: true,
        winnerTeamId: immediateWinner,
        timerRequests: [timerRequest],
        events: [event],
      };
    }

    // No victory from pending contributions -> round remains ACTIVE
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
    pendingContributions: readonly AxBCommand[],
    scoreGoal: number,
  ): {
    scoreA: number;
    scoreB: number;
    immediateWinner: AxBTeamId | null;
    victoryIndex: number;
  } {
    let scoreA = 0;
    let scoreB = 0;
    let immediateWinner: AxBTeamId | null = null;
    let victoryIndex = -1;

    for (let i = 0; i < pendingContributions.length; i++) {
      const contribution = pendingContributions[i];
      if (contribution.type === 'GIFT') {
        const points = contribution.count * contribution.pointsPerUnit;
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
    }

    return { scoreA, scoreB, immediateWinner, victoryIndex };
  }

  private checkVictoryAndAdvance(params: {
    state: AxBState;
    newScoreA: number;
    newScoreB: number;
    nextUserCooldowns: Readonly<Record<string, number>>;
    nextActiveCombos: Readonly<Record<string, number>>;
    context: ExecutionContext;
    config: AxBConfig;
  }): DecisionResult<AxBState> {
    const {
      state,
      newScoreA,
      newScoreB,
      nextUserCooldowns,
      nextActiveCombos,
      context,
      config,
    } = params;

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
        activeCombos: nextActiveCombos,
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
      activeCombos: nextActiveCombos,
    };

    return {
      nextState,
      status: 'APPLIED',
    };
  }
}
