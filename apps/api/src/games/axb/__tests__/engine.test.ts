import { describe, expect, it } from 'vitest';
import { AxBGameEngine, createInitialAxBState } from '../engine.js';
import { DEFAULT_AXB_CONFIG } from '../constants.js';
import type {
  AxBCommand,
  AxBConfig,
  AxBGiftCommand,
  AxBIntervalExpiredCommand,
  AxBState,
  AxBVoteCommand,
} from '../types.js';
import type { ExecutionContext } from '../../../contracts/engine.js';

describe('AxBGameEngine (TDD Red -> Green)', () => {
  const engine = new AxBGameEngine();

  const activeContext: ExecutionContext = {
    timestamp: 10000,
    isPaused: false,
  };

  const pausedContext: ExecutionContext = {
    timestamp: 10000,
    isPaused: true,
  };

  describe('createInitialAxBState', () => {
    it('creates fresh initial state with default configuration', () => {
      const state = createInitialAxBState();

      expect(state.currentRound).toBe(1);
      expect(state.roundStatus).toBe('ACTIVE');
      expect(state.score).toEqual({ teamA: 0, teamB: 0 });
      expect(state.userCommentCooldowns).toEqual({});
      expect(state.activeCombos).toEqual({});
      expect(state.pendingContributions).toEqual([]);
      expect(state.history).toEqual([]);
    });

    it('creates state via engine.createInitialState', () => {
      const state = engine.createInitialState(DEFAULT_AXB_CONFIG);
      expect(state.currentRound).toBe(1);
      expect(state.roundStatus).toBe('ACTIVE');
    });
  });

  describe('validateConfig', () => {
    it('validates and returns parsed AxBConfig', () => {
      expect(typeof engine.validateConfig).toBe('function');
      const result = engine.validateConfig!(DEFAULT_AXB_CONFIG);
      expect(result).toEqual(DEFAULT_AXB_CONFIG);
    });

    it('throws error when validating invalid configuration', () => {
      expect(() => {
        engine.validateConfig!({ invalid: true });
      }).toThrow();
    });
  });

  describe('RG-01: Vote Point Allocation', () => {
    it('adds +1 point to Team A for a vote on A', () => {
      const initialState = createInitialAxBState();
      const voteA: AxBVoteCommand = {
        type: 'VOTE',
        team: 'A',
        userId: 'user-1',
        timestamp: 10000,
      };

      const result = engine.applyCommand(
        initialState,
        voteA,
        activeContext,
        DEFAULT_AXB_CONFIG,
      );

      expect(result.status).toBe('APPLIED');
      expect(result.nextState.score.teamA).toBe(1);
      expect(result.nextState.score.teamB).toBe(0);
      expect(result.nextState.userCommentCooldowns['user-1']).toBe(10000);
    });

    it('adds +1 point to Team B for a vote on B', () => {
      const initialState = createInitialAxBState();
      const voteB: AxBVoteCommand = {
        type: 'VOTE',
        team: 'B',
        userId: 'user-2',
        timestamp: 10000,
      };

      const result = engine.applyCommand(
        initialState,
        voteB,
        activeContext,
        DEFAULT_AXB_CONFIG,
      );

      expect(result.status).toBe('APPLIED');
      expect(result.nextState.score.teamA).toBe(0);
      expect(result.nextState.score.teamB).toBe(1);
      expect(result.nextState.userCommentCooldowns['user-2']).toBe(10000);
    });
  });

  describe('RG-02: User Comment Cooldown (5s Shared)', () => {
    it('ignores vote if user voted less than 5000ms ago', () => {
      const initialState: AxBState = {
        ...createInitialAxBState(),
        score: { teamA: 1, teamB: 0 },
        userCommentCooldowns: { 'user-1': 10000 },
      };

      // 2 seconds later (12000 < 10000 + 5000)
      const earlyContext: ExecutionContext = {
        timestamp: 12000,
        isPaused: false,
      };
      const voteA: AxBVoteCommand = {
        type: 'VOTE',
        team: 'A',
        userId: 'user-1',
        timestamp: 12000,
      };

      const result = engine.applyCommand(
        initialState,
        voteA,
        earlyContext,
        DEFAULT_AXB_CONFIG,
      );

      expect(result.status).toBe('IGNORED');
      expect(result.reason).toBe('COOLDOWN_ACTIVE');
      expect(result.nextState.score.teamA).toBe(1);
      expect(result.nextState.userCommentCooldowns['user-1']).toBe(10000);
    });

    it('blocks switching team within cooldown (shared between A and B)', () => {
      const initialState: AxBState = {
        ...createInitialAxBState(),
        score: { teamA: 1, teamB: 0 },
        userCommentCooldowns: { 'user-1': 10000 },
      };

      // Tries to vote for B at 13000
      const earlyContext: ExecutionContext = {
        timestamp: 13000,
        isPaused: false,
      };
      const voteB: AxBVoteCommand = {
        type: 'VOTE',
        team: 'B',
        userId: 'user-1',
        timestamp: 13000,
      };

      const result = engine.applyCommand(
        initialState,
        voteB,
        earlyContext,
        DEFAULT_AXB_CONFIG,
      );

      expect(result.status).toBe('IGNORED');
      expect(result.reason).toBe('COOLDOWN_ACTIVE');
      expect(result.nextState.score.teamB).toBe(0);
    });

    it('accepts vote once 5000ms have elapsed and updates cooldown timestamp', () => {
      const initialState: AxBState = {
        ...createInitialAxBState(),
        score: { teamA: 1, teamB: 0 },
        userCommentCooldowns: { 'user-1': 10000 },
      };

      // Exactly 5000ms later (15000 >= 10000 + 5000)
      const eligibleContext: ExecutionContext = {
        timestamp: 15000,
        isPaused: false,
      };
      const voteB: AxBVoteCommand = {
        type: 'VOTE',
        team: 'B',
        userId: 'user-1',
        timestamp: 15000,
      };

      const result = engine.applyCommand(
        initialState,
        voteB,
        eligibleContext,
        DEFAULT_AXB_CONFIG,
      );

      expect(result.status).toBe('APPLIED');
      expect(result.nextState.score.teamB).toBe(1);
      expect(result.nextState.userCommentCooldowns['user-1']).toBe(15000);
    });

    it('persists user comment cooldowns across rounds of the same session', () => {
      const intervalState: AxBState = {
        ...createInitialAxBState(),
        currentRound: 1,
        roundStatus: 'INTERVAL',
        userCommentCooldowns: { 'user-1': 14000 },
      };

      // Interval expires at 16000 -> starts Round 2
      const expireCommand: AxBIntervalExpiredCommand = {
        type: 'INTERVAL_EXPIRED',
        timestamp: 16000,
      };

      const round2Result = engine.applyCommand(
        intervalState,
        expireCommand,
        { timestamp: 16000, isPaused: false },
        DEFAULT_AXB_CONFIG,
      );

      expect(round2Result.nextState.currentRound).toBe(2);
      expect(round2Result.nextState.userCommentCooldowns['user-1']).toBe(14000);

      // Now at 17000 in Round 2, user-1 is still within 5s cooldown (17000 < 14000 + 5000)
      const voteInRound2: AxBVoteCommand = {
        type: 'VOTE',
        team: 'A',
        userId: 'user-1',
        timestamp: 17000,
      };

      const voteResult = engine.applyCommand(
        round2Result.nextState,
        voteInRound2,
        { timestamp: 17000, isPaused: false },
        DEFAULT_AXB_CONFIG,
      );

      expect(voteResult.status).toBe('IGNORED');
      expect(voteResult.reason).toBe('COOLDOWN_ACTIVE');
      expect(voteResult.nextState.score.teamA).toBe(0);
    });
  });

  describe('RG-03: Comments Discarded in Pause or Interval', () => {
    it('discards comment when session is paused', () => {
      const initialState = createInitialAxBState();
      const voteA: AxBVoteCommand = {
        type: 'VOTE',
        team: 'A',
        userId: 'user-1',
        timestamp: 10000,
      };

      const result = engine.applyCommand(
        initialState,
        voteA,
        pausedContext,
        DEFAULT_AXB_CONFIG,
      );

      expect(result.status).toBe('IGNORED');
      expect(result.reason).toBe('SESSION_PAUSED');
      expect(result.nextState.score.teamA).toBe(0);
      expect(result.nextState.pendingContributions).toHaveLength(0);
    });

    it('discards comment when round status is INTERVAL', () => {
      const intervalState: AxBState = {
        ...createInitialAxBState(),
        roundStatus: 'INTERVAL',
      };

      const voteA: AxBVoteCommand = {
        type: 'VOTE',
        team: 'A',
        userId: 'user-1',
        timestamp: 10000,
      };

      const result = engine.applyCommand(
        intervalState,
        voteA,
        activeContext,
        DEFAULT_AXB_CONFIG,
      );

      expect(result.status).toBe('IGNORED');
      expect(result.reason).toBe('ROUND_NOT_ACTIVE');
      expect(result.nextState.score.teamA).toBe(0);
      expect(result.nextState.pendingContributions).toHaveLength(0);
    });
  });

  describe('RG-04 & RG-05: Gifts and Combo Delta Recognition', () => {
    it('scores full units for standalone gift', () => {
      const initialState = createInitialAxBState();
      const giftCmd: AxBGiftCommand = {
        type: 'GIFT',
        team: 'A',
        pointsPerUnit: 10,
        giftId: '5655',
        userId: 'donor-1',
        count: 2,
        comboKey: 'donor-1:5655',
        timestamp: 10000,
      };

      const result = engine.applyCommand(
        initialState,
        giftCmd,
        activeContext,
        DEFAULT_AXB_CONFIG,
      );

      expect(result.status).toBe('APPLIED');
      expect(result.nextState.score.teamA).toBe(20); // 2 * 10
      expect(result.nextState.activeCombos['donor-1:5655']).toBe(2);
    });

    it('recognizes strictly positive delta in cumulative combos (1 -> 2 -> 3 -> 3 final)', () => {
      let state = createInitialAxBState();

      // Combo 1: count = 1
      const cmd1: AxBGiftCommand = {
        type: 'GIFT',
        team: 'B',
        pointsPerUnit: 10,
        giftId: '5879',
        userId: 'donor-1',
        count: 1,
        comboKey: 'donor-1:5879:seq-1',
        timestamp: 10000,
      };
      let res = engine.applyCommand(
        state,
        cmd1,
        activeContext,
        DEFAULT_AXB_CONFIG,
      );
      expect(res.nextState.score.teamB).toBe(10);
      expect(res.nextState.activeCombos['donor-1:5879:seq-1']).toBe(1);
      state = res.nextState;

      // Combo 2: count = 2 -> delta = 1 -> +10 pts
      const cmd2: AxBGiftCommand = {
        ...cmd1,
        count: 2,
        timestamp: 10100,
      };
      res = engine.applyCommand(state, cmd2, activeContext, DEFAULT_AXB_CONFIG);
      expect(res.nextState.score.teamB).toBe(20);
      expect(res.nextState.activeCombos['donor-1:5879:seq-1']).toBe(2);
      state = res.nextState;

      // Combo 3: count = 3 -> delta = 1 -> +10 pts
      const cmd3: AxBGiftCommand = {
        ...cmd1,
        count: 3,
        timestamp: 10200,
      };
      res = engine.applyCommand(state, cmd3, activeContext, DEFAULT_AXB_CONFIG);
      expect(res.nextState.score.teamB).toBe(30);
      expect(res.nextState.activeCombos['donor-1:5879:seq-1']).toBe(3);
      state = res.nextState;

      // Combo final: count = 3 repeated -> delta = 0 -> 0 pts added
      const cmdFinal: AxBGiftCommand = {
        ...cmd1,
        count: 3,
        timestamp: 10300,
      };
      res = engine.applyCommand(
        state,
        cmdFinal,
        activeContext,
        DEFAULT_AXB_CONFIG,
      );
      expect(res.status).toBe('IGNORED');
      expect(res.reason).toBe('DUPLICATE_OR_OLD_COMBO_COUNT');
      expect(res.nextState.score.teamB).toBe(30);
      expect(res.nextState.activeCombos['donor-1:5879:seq-1']).toBe(3);
    });

    it('ignores out-of-order gift message with lower count than already recognized', () => {
      const state: AxBState = {
        ...createInitialAxBState(),
        score: { teamA: 50, teamB: 0 },
        activeCombos: { 'donor-1:5655': 5 },
      };

      const outOfOrderCmd: AxBGiftCommand = {
        type: 'GIFT',
        team: 'A',
        pointsPerUnit: 10,
        giftId: '5655',
        userId: 'donor-1',
        count: 3, // 3 < 5
        comboKey: 'donor-1:5655',
        timestamp: 10500,
      };

      const result = engine.applyCommand(
        state,
        outOfOrderCmd,
        activeContext,
        DEFAULT_AXB_CONFIG,
      );

      expect(result.status).toBe('IGNORED');
      expect(result.reason).toBe('DUPLICATE_OR_OLD_COMBO_COUNT');
      expect(result.nextState.score.teamA).toBe(50);
      expect(result.nextState.activeCombos['donor-1:5655']).toBe(5);
    });
  });

  describe('RG-08: Gifts Received During Pause or Interval', () => {
    it('defers mapped gift when paused and adds resolved delta to pendingContributions', () => {
      const state = createInitialAxBState();

      const giftCmd: AxBGiftCommand = {
        type: 'GIFT',
        team: 'A',
        pointsPerUnit: 50,
        giftId: '5827',
        userId: 'donor-3',
        count: 2,
        comboKey: 'donor-3:5827',
        timestamp: 11000,
      };

      const result = engine.applyCommand(
        state,
        giftCmd,
        pausedContext,
        DEFAULT_AXB_CONFIG,
      );

      expect(result.status).toBe('DEFERRED');
      expect(result.nextState.score.teamA).toBe(0); // Score NOT increased yet
      expect(result.nextState.activeCombos['donor-3:5827']).toBe(2);
      expect(result.nextState.pendingContributions).toHaveLength(1);
      expect(result.nextState.pendingContributions[0]).toMatchObject({
        type: 'GIFT',
        team: 'A',
        pointsPerUnit: 50,
        count: 2,
      });
    });

    it('recognizes combo delta only once during pause even if repeated', () => {
      let state = createInitialAxBState();

      const giftCmd1: AxBGiftCommand = {
        type: 'GIFT',
        team: 'A',
        pointsPerUnit: 10,
        giftId: '5655',
        userId: 'donor-4',
        count: 1,
        comboKey: 'donor-4:5655',
        timestamp: 11000,
      };

      let res = engine.applyCommand(
        state,
        giftCmd1,
        pausedContext,
        DEFAULT_AXB_CONFIG,
      );
      expect(res.status).toBe('DEFERRED');
      expect(res.nextState.pendingContributions).toHaveLength(1);
      state = res.nextState;

      // Repeat count 1 while paused
      res = engine.applyCommand(
        state,
        giftCmd1,
        pausedContext,
        DEFAULT_AXB_CONFIG,
      );
      expect(res.status).toBe('IGNORED');
      expect(res.nextState.pendingContributions).toHaveLength(1); // No duplicate added
      state = res.nextState;

      // Count 3 while paused (delta = 2)
      const giftCmd3: AxBGiftCommand = {
        ...giftCmd1,
        count: 3,
        timestamp: 11100,
      };
      res = engine.applyCommand(
        state,
        giftCmd3,
        pausedContext,
        DEFAULT_AXB_CONFIG,
      );
      expect(res.status).toBe('DEFERRED');
      expect(res.nextState.pendingContributions).toHaveLength(2);
      expect(res.nextState.pendingContributions[1]).toMatchObject({
        count: 2, // Recognized delta = 3 - 1 = 2
      });
    });

    it('defers mapped gift when round is in INTERVAL', () => {
      const intervalState: AxBState = {
        ...createInitialAxBState(),
        roundStatus: 'INTERVAL',
      };

      const giftCmd: AxBGiftCommand = {
        type: 'GIFT',
        team: 'B',
        pointsPerUnit: 10,
        giftId: '5879',
        userId: 'donor-5',
        count: 1,
        comboKey: 'donor-5:5879',
        timestamp: 12000,
      };

      const result = engine.applyCommand(
        intervalState,
        giftCmd,
        activeContext,
        DEFAULT_AXB_CONFIG,
      );

      expect(result.status).toBe('DEFERRED');
      expect(result.nextState.score.teamB).toBe(0);
      expect(result.nextState.pendingContributions).toHaveLength(1);
    });
  });

  describe('RG-09 & RG-10: Victory, Excess Points and Interval Timer', () => {
    const customConfig: AxBConfig = {
      ...DEFAULT_AXB_CONFIG,
      scoreGoal: 1000,
      intervalDurationMs: 5000,
    };

    it('declares victory when score reaches goal and records excess points in round score', () => {
      const state: AxBState = {
        ...createInitialAxBState(),
        currentRound: 1,
        score: { teamA: 990, teamB: 800 },
      };

      // Gift adding 50 points (990 + 50 = 1040 >= 1000)
      const giftCmd: AxBGiftCommand = {
        type: 'GIFT',
        team: 'A',
        pointsPerUnit: 50,
        giftId: '5827',
        userId: 'winner-donor',
        count: 1,
        timestamp: 20000,
      };

      const result = engine.applyCommand(
        state,
        giftCmd,
        activeContext,
        customConfig,
      );

      expect(result.status).toBe('APPLIED');
      expect(result.roundEnded).toBe(true);
      expect(result.winnerTeamId).toBe('A');

      // Next state updates
      expect(result.nextState.roundStatus).toBe('INTERVAL');
      expect(result.nextState.score.teamA).toBe(1040); // RG-10: excess points kept
      expect(result.nextState.score.teamB).toBe(800);

      // History recorded
      expect(result.nextState.history).toHaveLength(1);
      expect(result.nextState.history[0]).toEqual({
        roundNumber: 1,
        winner: 'A',
        finalScore: { teamA: 1040, teamB: 800 },
        completedAt: 10000,
      });

      // Timer request emitted
      expect(result.timerRequests).toBeDefined();
      expect(result.timerRequests).toHaveLength(1);
      expect(result.timerRequests![0]).toEqual({
        id: 'interval-round-1',
        delayMs: 5000,
        type: 'INTERVAL_EXPIRED',
        payload: { round: 1 },
      });

      // Event emitted
      expect(result.events).toBeDefined();
      expect(result.events![0]).toMatchObject({
        type: 'ROUND_WON',
        payload: {
          round: 1,
          winner: 'A',
          score: { teamA: 1040, teamB: 800 },
        },
      });
    });

    it('declares victory for Team B when vote reaches exact goal', () => {
      const state: AxBState = {
        ...createInitialAxBState(),
        currentRound: 1,
        score: { teamA: 500, teamB: 999 },
      };

      const voteB: AxBVoteCommand = {
        type: 'VOTE',
        team: 'B',
        userId: 'clutch-voter',
        timestamp: 21000,
      };

      const result = engine.applyCommand(
        state,
        voteB,
        { timestamp: 21000, isPaused: false },
        customConfig,
      );

      expect(result.roundEnded).toBe(true);
      expect(result.winnerTeamId).toBe('B');
      expect(result.nextState.score.teamB).toBe(1000);
      expect(result.nextState.roundStatus).toBe('INTERVAL');
      expect(result.nextState.history[0].winner).toBe('B');
    });
  });

  describe('RG-11 & RG-12: Interval Expiration and FIFO Pending Contributions', () => {
    it('resets score, increments currentRound, sets ACTIVE, and consumes pending contributions', () => {
      const intervalState: AxBState = {
        ...createInitialAxBState(),
        currentRound: 1,
        roundStatus: 'INTERVAL',
        score: { teamA: 1040, teamB: 500 },
        history: [
          {
            roundNumber: 1,
            winner: 'A',
            finalScore: { teamA: 1040, teamB: 500 },
            completedAt: 10000,
          },
        ],
        pendingContributions: [
          {
            type: 'GIFT',
            team: 'A',
            pointsPerUnit: 10,
            giftId: '5655',
            userId: 'donor-1',
            count: 5, // 50 points
            timestamp: 10500,
          },
          {
            type: 'GIFT',
            team: 'B',
            pointsPerUnit: 50,
            giftId: '5827',
            userId: 'donor-2',
            count: 2, // 100 points
            timestamp: 10600,
          },
        ],
      };

      const expireCmd: AxBIntervalExpiredCommand = {
        type: 'INTERVAL_EXPIRED',
        timestamp: 15000,
      };

      const result = engine.applyCommand(
        intervalState,
        expireCmd,
        { timestamp: 15000, isPaused: false },
        DEFAULT_AXB_CONFIG,
      );

      expect(result.status).toBe('APPLIED');
      expect(result.roundEnded).toBeFalsy();
      expect(result.nextState.currentRound).toBe(2);
      expect(result.nextState.roundStatus).toBe('ACTIVE');

      // Score in Round 2 starts at 0, plus pending: Team A = 50, Team B = 100
      expect(result.nextState.score).toEqual({ teamA: 50, teamB: 100 });
      expect(result.nextState.pendingContributions).toHaveLength(0);
      expect(result.nextState.history).toHaveLength(1); // Still round 1 history
    });

    it('RG-12: immediately ends new round if pending contribution reaches goal, preserving remaining pending for next round', () => {
      const configWithGoal: AxBConfig = {
        ...DEFAULT_AXB_CONFIG,
        scoreGoal: 1000,
        intervalDurationMs: 5000,
      };

      const pending1: AxBGiftCommand = {
        type: 'GIFT',
        team: 'A',
        pointsPerUnit: 10,
        giftId: '5655',
        userId: 'donor-1',
        count: 50, // 500 pts
        timestamp: 10100,
      };

      const pending2: AxBGiftCommand = {
        type: 'GIFT',
        team: 'A',
        pointsPerUnit: 10,
        giftId: '5655',
        userId: 'donor-1',
        count: 60, // 600 pts -> 500 + 600 = 1100 >= 1000 -> WINS ROUND 2!
        timestamp: 10200,
      };

      const pending3: AxBGiftCommand = {
        type: 'GIFT',
        team: 'B',
        pointsPerUnit: 50,
        giftId: '5827',
        userId: 'donor-2',
        count: 2, // 100 pts -> Must stay pending for Round 3!
        timestamp: 10300,
      };

      const intervalState: AxBState = {
        ...createInitialAxBState(),
        currentRound: 1,
        roundStatus: 'INTERVAL',
        pendingContributions: [pending1, pending2, pending3],
      };

      const expireCmd: AxBIntervalExpiredCommand = {
        type: 'INTERVAL_EXPIRED',
        timestamp: 15000,
      };

      const result = engine.applyCommand(
        intervalState,
        expireCmd,
        { timestamp: 15000, isPaused: false },
        configWithGoal,
      );

      // Round 2 ended immediately
      expect(result.roundEnded).toBe(true);
      expect(result.winnerTeamId).toBe('A');
      expect(result.nextState.currentRound).toBe(2);
      expect(result.nextState.roundStatus).toBe('INTERVAL');
      expect(result.nextState.score.teamA).toBe(1100);
      expect(result.nextState.score.teamB).toBe(0);

      // History contains round 2
      expect(result.nextState.history).toHaveLength(1);
      expect(result.nextState.history[0]).toEqual({
        roundNumber: 2,
        winner: 'A',
        finalScore: { teamA: 1100, teamB: 0 },
        completedAt: 15000,
      });

      // New interval timer emitted for round 2
      expect(result.timerRequests).toHaveLength(1);
      expect(result.timerRequests![0].id).toBe('interval-round-2');

      // Remaining pending contribution 3 is PRESERVED for round 3!
      expect(result.nextState.pendingContributions).toHaveLength(1);
      expect(result.nextState.pendingContributions[0]).toEqual(pending3);
    });

    it('immediately ends new round if pending contribution reaches goal for Team B', () => {
      const configWithGoal: AxBConfig = {
        ...DEFAULT_AXB_CONFIG,
        scoreGoal: 1000,
        intervalDurationMs: 5000,
      };

      const pendingB: AxBGiftCommand = {
        type: 'GIFT',
        team: 'B',
        pointsPerUnit: 50,
        giftId: '5827',
        userId: 'donor-b',
        count: 20, // 1000 pts -> WINS ROUND 2 FOR TEAM B!
        timestamp: 10200,
      };

      const intervalState: AxBState = {
        ...createInitialAxBState(),
        currentRound: 1,
        roundStatus: 'INTERVAL',
        pendingContributions: [pendingB],
      };

      const expireCmd: AxBIntervalExpiredCommand = {
        type: 'INTERVAL_EXPIRED',
        timestamp: 15000,
      };

      const result = engine.applyCommand(
        intervalState,
        expireCmd,
        { timestamp: 15000, isPaused: false },
        configWithGoal,
      );

      expect(result.roundEnded).toBe(true);
      expect(result.winnerTeamId).toBe('B');
      expect(result.nextState.score.teamB).toBe(1000);
      expect(result.nextState.history[0].winner).toBe('B');
    });

    it('ignores INTERVAL_EXPIRED if round is not in INTERVAL (e.g. currently ACTIVE)', () => {
      const activeState = createInitialAxBState(); // roundStatus is ACTIVE

      const expireCmd: AxBIntervalExpiredCommand = {
        type: 'INTERVAL_EXPIRED',
        timestamp: 15000,
      };

      const result = engine.applyCommand(
        activeState,
        expireCmd,
        { timestamp: 15000, isPaused: false },
        DEFAULT_AXB_CONFIG,
      );

      expect(result.status).toBe('IGNORED');
      expect(result.reason).toBe('ROUND_NOT_IN_INTERVAL');
      expect(result.nextState.roundStatus).toBe('ACTIVE');
    });

    it('defers INTERVAL_EXPIRED if session is currently paused', () => {
      const intervalState: AxBState = {
        ...createInitialAxBState(),
        roundStatus: 'INTERVAL',
      };

      const expireCmd: AxBIntervalExpiredCommand = {
        type: 'INTERVAL_EXPIRED',
        timestamp: 15000,
      };

      const result = engine.applyCommand(
        intervalState,
        expireCmd,
        pausedContext,
        DEFAULT_AXB_CONFIG,
      );

      expect(result.status).toBe('DEFERRED');
      expect(result.reason).toBe('SESSION_PAUSED');
      expect(result.nextState.roundStatus).toBe('INTERVAL');
      expect(result.nextState.currentRound).toBe(1);
    });
  });

  describe('Edge cases and fallbacks', () => {
    it('uses DEFAULT_AXB_CONFIG when config is omitted in applyCommand', () => {
      const initialState = createInitialAxBState();
      const voteA: AxBVoteCommand = {
        type: 'VOTE',
        team: 'A',
        userId: 'user-default-cfg',
        timestamp: 10000,
      };

      const result = engine.applyCommand(initialState, voteA, activeContext);
      expect(result.status).toBe('APPLIED');
      expect(result.nextState.score.teamA).toBe(1);
    });

    it('ignores unknown command safely', () => {
      const initialState = createInitialAxBState();
      const unknownCmd = {
        type: 'UNKNOWN_COMMAND_TYPE',
        timestamp: 10000,
      } as unknown as AxBCommand;

      const result = engine.applyCommand(
        initialState,
        unknownCmd,
        activeContext,
      );
      expect(result.status).toBe('IGNORED');
      expect(result.reason).toBe('UNKNOWN_COMMAND');
    });
  });
});
