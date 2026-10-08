import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { useOverlaySession } from '../use-overlay-session';
import { useOverlayStore } from '../../stores/use-overlay-store';
import * as apiClient from '@/api/client';
import type { RealtimeClient } from '@/lib/socket-client';
import type {
  AxBConfig,
  GameSession,
  GameSnapshot,
  ContributionAlert,
} from '@/api/types';
import type {
  AudioContextLike,
  GainNodeLike,
  OscillatorNodeLike,
  AudioParamLike,
} from '../../audio/audio-effect-engine';

vi.mock('@/api/client', () => ({
  getSession: vi.fn(),
}));

class MockAudioParam implements AudioParamLike {
  constructor(public value: number = 1) {}
  setValueAtTime = vi.fn();
  linearRampToValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
}

class MockGainNode implements GainNodeLike {
  gain = new MockAudioParam(1);
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockOscillatorNode implements OscillatorNodeLike {
  type: OscillatorType = 'sine';
  frequency = new MockAudioParam(440);
  onended: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockAudioContext implements AudioContextLike {
  currentTime = 0;
  state: AudioContextState = 'suspended';
  destination = {};
  createOscillator = vi.fn(() => new MockOscillatorNode());
  createGain = vi.fn(() => new MockGainNode());
  resume = vi.fn(async () => {
    this.state = 'running';
  });
  close = vi.fn(async () => {
    this.state = 'closed';
  });
}

const mockConfig: AxBConfig = {
  teamA: { id: 'A', name: 'Time A', color: '#ff0000' },
  teamB: { id: 'B', name: 'Time B', color: '#0000ff' },
  scoreGoal: 100,
  commentCooldownMs: 1000,
  intervalDurationMs: 5000,
  giftRules: [{ resourceKey: 'rose', targetTeam: 'A', pointsPerUnit: 10 }],
};

const mockSession: GameSession = {
  id: 'sess-123',
  gameId: 'axb',
  operatorId: 'op-1',
  status: 'RUNNING',
  title: 'Live Arena',
  config: mockConfig,
  startedAt: '2026-10-08T10:00:00.000Z',
  endedAt: null,
  createdAt: '2026-10-08T10:00:00.000Z',
  updatedAt: '2026-10-08T10:00:00.000Z',
};

describe('useOverlaySession hook', () => {
  let queryClient: QueryClient;
  let mockRealtime: Partial<RealtimeClient> & {
    emitSnapshot: (s: GameSnapshot) => void;
    emitAlert: (a: ContributionAlert) => void;
    emitStatus: (c: boolean) => void;
  };
  let snapshotListeners: Set<(s: GameSnapshot) => void>;
  let alertListeners: Set<(a: ContributionAlert) => void>;
  let statusListeners: Set<(c: boolean) => void>;
  let mockAudioCtx: MockAudioContext;

  beforeEach(() => {
    useOverlayStore.getState().reset();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.mocked(apiClient.getSession).mockResolvedValue(mockSession);

    snapshotListeners = new Set();
    alertListeners = new Set();
    statusListeners = new Set();
    mockAudioCtx = new MockAudioContext();

    mockRealtime = {
      connect: vi.fn(),
      joinSession: vi.fn(),
      leaveSession: vi.fn(),
      onSnapshot: vi.fn((cb) => {
        snapshotListeners.add(cb);
        return () => snapshotListeners.delete(cb);
      }),
      onAlert: vi.fn((cb) => {
        alertListeners.add(cb);
        return () => alertListeners.delete(cb);
      }),
      onStatusChange: vi.fn((cb) => {
        statusListeners.add(cb);
        return () => statusListeners.delete(cb);
      }),
      emitSnapshot: (s) => snapshotListeners.forEach((l) => l(s)),
      emitAlert: (a) => alertListeners.forEach((l) => l(a)),
      emitStatus: (c) => statusListeners.forEach((l) => l(c)),
    };
  });

  function wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  it('joins realtime session and loads initial session config', async () => {
    const { result } = renderHook(
      () =>
        useOverlaySession({
          sessionId: 'sess-123',
          volume: 0.6,
          muted: false,
          realtime: mockRealtime as unknown as RealtimeClient,
          audioContextFactory: () => mockAudioCtx,
        }),
      { wrapper },
    );

    expect(mockRealtime.connect).toHaveBeenCalled();
    expect(mockRealtime.joinSession).toHaveBeenCalledWith('sess-123');

    await waitFor(() => {
      expect(result.current.config).toEqual(mockConfig);
      expect(result.current.gameId).toBe('axb');
    });
  });

  it('receives snapshots and alerts via realtime subscriptions', async () => {
    const { result } = renderHook(
      () =>
        useOverlaySession({
          sessionId: 'sess-123',
          volume: 0.6,
          muted: false,
          realtime: mockRealtime as unknown as RealtimeClient,
          audioContextFactory: () => mockAudioCtx,
        }),
      { wrapper },
    );

    act(() => {
      mockRealtime.emitStatus(true);
    });
    expect(result.current.connected).toBe(true);

    const snapshot: GameSnapshot = {
      sessionId: 'sess-123',
      gameId: 'axb',
      sequence: 1,
      projection: {
        round: 1,
        roundStatus: 'ACTIVE',
        scoreGoal: 100,
        teamA: {
          id: 'A',
          name: 'Time A',
          color: '#f00',
          score: 10,
          wins: 0,
          progressPercentage: 10,
          relativePercentage: 50,
        },
        teamB: {
          id: 'B',
          name: 'Time B',
          color: '#00f',
          score: 10,
          wins: 0,
          progressPercentage: 10,
          relativePercentage: 50,
        },
        history: [],
        isPaused: false,
        pendingCount: 0,
        lastWinner: null,
      },
    };

    act(() => {
      mockRealtime.emitSnapshot(snapshot);
    });

    expect(result.current.projection).toEqual(snapshot.projection);

    // Emit alert
    act(() => {
      mockRealtime.emitAlert({
        userId: 'u1',
        userName: 'Gamer',
        resourceKey: 'rose',
        units: 1,
        timestamp: Date.now(),
      });
    });

    expect(result.current.alerts).toHaveLength(1);
  });

  it('leaves session on unmount', () => {
    const { unmount } = renderHook(
      () =>
        useOverlaySession({
          sessionId: 'sess-123',
          volume: 0.6,
          muted: false,
          realtime: mockRealtime as unknown as RealtimeClient,
          audioContextFactory: () => mockAudioCtx,
        }),
      { wrapper },
    );

    unmount();
    expect(mockRealtime.leaveSession).toHaveBeenCalledWith('sess-123');
  });
});
