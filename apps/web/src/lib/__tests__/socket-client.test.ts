import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RealtimeClient } from '../socket-client';
import type {
  GameSnapshot,
  ContributionAlert,
  AxBProjection,
} from '@/api/types';

type EventHandler = (data?: unknown) => void;

describe('RealtimeClient', () => {
  let mockSocket: {
    on: ReturnType<typeof vi.fn>;
    off: ReturnType<typeof vi.fn>;
    emit: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    connected: boolean;
  };
  let socketFactory: ReturnType<typeof vi.fn>;
  let rafCallbacks: FrameRequestCallback[] = [];
  let rafId = 0;

  beforeEach(() => {
    rafCallbacks = [];
    rafId = 0;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return ++rafId;
    });
    vi.stubGlobal('cancelAnimationFrame', (_id: number) => {
      // no-op
    });

    const handlers: Record<string, EventHandler[]> = {};
    mockSocket = {
      connected: false,
      on: vi.fn((event: string, handler: EventHandler) => {
        handlers[event] = handlers[event] || [];
        handlers[event]?.push(handler);
        return mockSocket;
      }),
      off: vi.fn((event: string, handler?: EventHandler) => {
        if (handlers[event] && handler) {
          handlers[event] = handlers[event].filter((h) => h !== handler);
        } else {
          delete handlers[event];
        }
        return mockSocket;
      }),
      emit: vi.fn(),
      connect: vi.fn(() => {
        mockSocket.connected = true;
        handlers['connect']?.forEach((cb) => cb());
        return mockSocket;
      }),
      disconnect: vi.fn(() => {
        mockSocket.connected = false;
        handlers['disconnect']?.forEach((cb) => cb('io client disconnect'));
        return mockSocket;
      }),
    };

    socketFactory = vi.fn(() => mockSocket);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const triggerSocketEvent = (event: string, data?: unknown) => {
    const calls = mockSocket.on.mock.calls.filter(([evt]) => evt === event);
    calls.forEach(([, handler]) => (handler as EventHandler)(data));
  };

  const triggerRaf = (time = performance.now()) => {
    const current = [...rafCallbacks];
    rafCallbacks = [];
    current.forEach((cb) => cb(time));
  };

  const dummyProjection: AxBProjection = {
    round: 1,
    roundStatus: 'ACTIVE',
    scoreGoal: 1000,
    teamA: {
      id: 'A',
      name: 'A',
      color: '#f00',
      score: 0,
      wins: 0,
      progressPercentage: 0,
      relativePercentage: 50,
    },
    teamB: {
      id: 'B',
      name: 'B',
      color: '#00f',
      score: 0,
      wins: 0,
      progressPercentage: 0,
      relativePercentage: 50,
    },
    history: [],
    isPaused: false,
    pendingCount: 0,
    lastWinner: null,
  };

  it('initializes and connects via factory', () => {
    const client = new RealtimeClient({ socketFactory });
    expect(client).toBeDefined();

    client.connect();
    expect(socketFactory).toHaveBeenCalled();
    expect(mockSocket.connect).toHaveBeenCalled();
  });

  it('joins session room and leaves session room', () => {
    const client = new RealtimeClient({ socketFactory });
    client.connect();

    client.joinSession('sess-100');
    expect(mockSocket.emit).toHaveBeenCalledWith('join', 'session:sess-100');

    client.leaveSession('sess-100');
    expect(mockSocket.emit).toHaveBeenCalledWith('leave', 'session:sess-100');
  });

  it('batches high frequency snapshots using rAF latest-wins', () => {
    const client = new RealtimeClient({ socketFactory });
    const snapshotSpy = vi.fn();
    client.onSnapshot(snapshotSpy);
    client.connect();

    const snap1: GameSnapshot = {
      sessionId: 'sess-1',
      gameId: 'axb',
      sequence: 1,
      projection: dummyProjection,
    };
    const snap2: GameSnapshot = {
      sessionId: 'sess-1',
      gameId: 'axb',
      sequence: 2,
      projection: dummyProjection,
    };
    const snap3: GameSnapshot = {
      sessionId: 'sess-1',
      gameId: 'axb',
      sequence: 3,
      projection: dummyProjection,
    };

    triggerSocketEvent('snapshot', snap1);
    triggerSocketEvent('snapshot', snap2);
    triggerSocketEvent('snapshot', snap3);

    expect(snapshotSpy).not.toHaveBeenCalled();

    triggerRaf();

    expect(snapshotSpy).toHaveBeenCalledTimes(1);
    expect(snapshotSpy).toHaveBeenCalledWith(snap3);

    triggerRaf();
    expect(snapshotSpy).toHaveBeenCalledTimes(1);
  });

  it('dispatches contribution_alert immediately without waiting for rAF', () => {
    const client = new RealtimeClient({ socketFactory });
    const alertSpy = vi.fn();
    client.onAlert(alertSpy);
    client.connect();

    const alert: ContributionAlert = {
      userId: 'u1',
      userName: 'PlayerOne',
      resourceKey: 'rose',
      units: 10,
      timestamp: Date.now(),
    };

    triggerSocketEvent('contribution_alert', alert);

    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith(alert);
  });

  it('dispatches status and tiktok events', () => {
    const client = new RealtimeClient({ socketFactory });
    const statusSpy = vi.fn();
    const tiktokSpy = vi.fn();

    client.onStatusChange(statusSpy);
    client.onTikTokEvent(tiktokSpy);
    client.connect();

    triggerSocketEvent('connect');
    expect(statusSpy).toHaveBeenCalledWith(true);

    triggerSocketEvent('disconnect');
    expect(statusSpy).toHaveBeenCalledWith(false);

    triggerSocketEvent('tiktok:connected', { username: 'gamer' });
    expect(tiktokSpy).toHaveBeenCalledWith({
      type: 'tiktok:connected',
      payload: { username: 'gamer' },
    });
  });

  it('cleans up on disconnect and removes listeners', () => {
    const client = new RealtimeClient({ socketFactory });
    const snapshotSpy = vi.fn();
    const alertSpy = vi.fn();
    const statusSpy = vi.fn();

    const offSnap = client.onSnapshot(snapshotSpy);
    const offAlert = client.onAlert(alertSpy);
    const offStatus = client.onStatusChange(statusSpy);

    client.connect();
    offSnap();
    offAlert();
    offStatus();

    triggerSocketEvent('snapshot', {
      sequence: 1,
      projection: dummyProjection,
    });
    triggerRaf();
    expect(snapshotSpy).not.toHaveBeenCalled();

    client.disconnect();
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});
