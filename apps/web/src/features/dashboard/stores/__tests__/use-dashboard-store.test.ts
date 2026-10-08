import { describe, it, expect, beforeEach } from 'vitest';
import { useDashboardStore } from '../use-dashboard-store';
import type {
  GameSession,
  GameSnapshot,
  ContributionAlert,
  AxBProjection,
} from '@/api/types';

describe('useDashboardStore', () => {
  beforeEach(() => {
    useDashboardStore.getState().reset();
  });

  it('initializes with default state', () => {
    const state = useDashboardStore.getState();
    expect(state.session).toBeNull();
    expect(state.snapshot).toBeNull();
    expect(state.activeAlerts).toEqual([]);
    expect(state.tiktokStatus).toEqual({
      status: 'disconnected',
      username: null,
      sessionId: null,
    });
    expect(state.eventsLog).toEqual([]);
    expect(state.metrics).toEqual({
      eventsCount: 0,
      eventsPerSecond: 0,
      snapshotsPerSecond: 0,
      latencyMs: 0,
      sequence: 0,
    });
    expect(state.isConnected).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('sets and clears session', () => {
    const mockSession: GameSession = {
      id: 'sess-1',
      gameId: 'axb',
      operatorId: 'op-1',
      status: 'CONFIGURING',
      title: 'Session 1',
      config: {
        teamA: { id: 'A', name: 'Team Red', color: '#ff0000' },
        teamB: { id: 'B', name: 'Team Blue', color: '#0000ff' },
        scoreGoal: 1000,
        commentCooldownMs: 1000,
        intervalDurationMs: 5000,
        giftRules: [],
      },
      startedAt: null,
      endedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    useDashboardStore.getState().setSession(mockSession);
    expect(useDashboardStore.getState().session).toEqual(mockSession);

    useDashboardStore.getState().setSession(null);
    expect(useDashboardStore.getState().session).toBeNull();
  });

  it('updates snapshot and tracks sequence metrics', () => {
    const mockProjection: AxBProjection = {
      round: 1,
      roundStatus: 'ACTIVE',
      scoreGoal: 1000,
      teamA: {
        id: 'A',
        name: 'Team A',
        color: '#ff0000',
        score: 50,
        wins: 0,
        progressPercentage: 5,
        relativePercentage: 50,
      },
      teamB: {
        id: 'B',
        name: 'Team B',
        color: '#0000ff',
        score: 50,
        wins: 0,
        progressPercentage: 5,
        relativePercentage: 50,
      },
      history: [],
      isPaused: false,
      pendingCount: 0,
      lastWinner: null,
    };

    const snapshot: GameSnapshot = {
      sessionId: 'sess-1',
      gameId: 'axb',
      sequence: 42,
      projection: mockProjection,
    };

    useDashboardStore.getState().updateSnapshot(snapshot);
    expect(useDashboardStore.getState().snapshot).toEqual(snapshot);
    expect(useDashboardStore.getState().metrics.sequence).toBe(42);
  });

  it('adds and dismisses contribution alerts', () => {
    const alert1: ContributionAlert = {
      id: 'alert-1',
      userId: 'u1',
      userName: 'Alice',
      resourceKey: 'rose',
      units: 5,
      timestamp: 1000,
    };
    const alert2: ContributionAlert = {
      userId: 'u2',
      userName: 'Bob',
      resourceKey: 'heart',
      units: 1,
      timestamp: 2000,
    };

    useDashboardStore.getState().addAlert(alert1);
    useDashboardStore.getState().addAlert(alert2);

    expect(useDashboardStore.getState().activeAlerts.length).toBe(2);
    expect(useDashboardStore.getState().eventsLog.length).toBe(2);

    useDashboardStore.getState().dismissAlert('alert-1');
    expect(useDashboardStore.getState().activeAlerts.length).toBe(1);
    expect(useDashboardStore.getState().activeAlerts[0]?.userName).toBe('Bob');
  });

  it('manages event log ring buffer with max capacity', () => {
    const store = useDashboardStore.getState();
    for (let i = 1; i <= 120; i++) {
      store.addLogEvent({
        type: 'comment',
        text: `Message ${i}`,
      });
    }

    const logs = useDashboardStore.getState().eventsLog;
    expect(logs.length).toBe(100);
    expect(logs[0]?.text).toBe('Message 120');
    expect(logs[99]?.text).toBe('Message 21');

    store.clearLog();
    expect(useDashboardStore.getState().eventsLog).toEqual([]);
  });

  it('updates TikTok status and connection state', () => {
    const store = useDashboardStore.getState();
    store.setTikTokStatus({
      status: 'connected',
      username: 'gamerlive',
      sessionId: 'sess-1',
    });
    expect(useDashboardStore.getState().tiktokStatus).toEqual({
      status: 'connected',
      username: 'gamerlive',
      sessionId: 'sess-1',
    });

    store.setConnected(true);
    expect(useDashboardStore.getState().isConnected).toBe(true);

    store.setLoading(true);
    expect(useDashboardStore.getState().isLoading).toBe(true);

    store.setError('Connection timeout');
    expect(useDashboardStore.getState().error).toBe('Connection timeout');
  });

  it('updates metrics properly', () => {
    const store = useDashboardStore.getState();
    store.updateMetrics({
      eventsCount: 150,
      eventsPerSecond: 25,
      snapshotsPerSecond: 60,
      latencyMs: 12,
    });

    expect(useDashboardStore.getState().metrics).toEqual({
      eventsCount: 150,
      eventsPerSecond: 25,
      snapshotsPerSecond: 60,
      latencyMs: 12,
      sequence: 0,
    });
  });
});
