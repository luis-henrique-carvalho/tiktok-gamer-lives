import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DashboardView } from '../views/dashboard-view';
import { useDashboardStore } from '../stores/use-dashboard-store';
import { authClient } from '@/lib/auth-client';
import type {
  GameSession,
  GameSnapshot,
  AxBProjection,
  ContributionAlert,
} from '@/api/types';

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    signOut: vi.fn(),
  },
}));

type ListenerFn = (...args: unknown[]) => void;

let snapshotListeners: ListenerFn[] = [];
let alertListeners: ListenerFn[] = [];
let statusListeners: ListenerFn[] = [];
let tiktokListeners: ListenerFn[] = [];

vi.mock('@/lib/socket-client', () => ({
  realtimeClient: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    joinSession: vi.fn(),
    leaveSession: vi.fn(),
    onSnapshot: vi.fn((fn: ListenerFn) => {
      snapshotListeners.push(fn);
      return () => {
        snapshotListeners = snapshotListeners.filter((l) => l !== fn);
      };
    }),
    onAlert: vi.fn((fn: ListenerFn) => {
      alertListeners.push(fn);
      return () => {
        alertListeners = alertListeners.filter((l) => l !== fn);
      };
    }),
    onStatusChange: vi.fn((fn: ListenerFn) => {
      statusListeners.push(fn);
      return () => {
        statusListeners = statusListeners.filter((l) => l !== fn);
      };
    }),
    onTikTokEvent: vi.fn((fn: ListenerFn) => {
      tiktokListeners.push(fn);
      return () => {
        tiktokListeners = tiktokListeners.filter((l) => l !== fn);
      };
    }),
  },
}));

describe('DashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    snapshotListeners = [];
    alertListeners = [];
    statusListeners = [];
    tiktokListeners = [];
    useDashboardStore.getState().reset();
  });

  const mockSession: GameSession = {
    id: 'sess-view-1',
    gameId: 'axb',
    operatorId: 'op-1',
    status: 'RUNNING',
    title: 'Duelo dos Gigantes',
    config: {
      teamA: { id: 'A', name: 'Dragões', color: '#ef4444' },
      teamB: { id: 'B', name: 'Fênix', color: '#3b82f6' },
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

  const mockProjection: AxBProjection = {
    round: 2,
    roundStatus: 'ACTIVE',
    scoreGoal: 1000,
    teamA: {
      id: 'A',
      name: 'Dragões',
      color: '#ef4444',
      score: 450,
      wins: 1,
      progressPercentage: 45,
      relativePercentage: 60,
    },
    teamB: {
      id: 'B',
      name: 'Fênix',
      color: '#3b82f6',
      score: 300,
      wins: 0,
      progressPercentage: 30,
      relativePercentage: 40,
    },
    history: [],
    isPaused: false,
    pendingCount: 0,
    lastWinner: 'A',
  };

  const mockSnapshot: GameSnapshot = {
    sessionId: 'sess-view-1',
    gameId: 'axb',
    sequence: 15,
    projection: mockProjection,
  };

  it('renders dashboard layout with header, components and overlay link', () => {
    render(<DashboardView />);

    expect(screen.getByText('Dashboard do Operador')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /abrir overlay/i }),
    ).toHaveAttribute('href', '/overlay');
    expect(screen.getByRole('button', { name: /sair/i })).toBeInTheDocument();
  });

  it('renders match score header when snapshot is available', () => {
    useDashboardStore.getState().setSession(mockSession);
    useDashboardStore.getState().updateSnapshot(mockSnapshot);

    render(<DashboardView />);

    expect(screen.getByText(/Dragões/)).toBeInTheDocument();
    expect(screen.getByText(/Fênix/)).toBeInTheDocument();
    expect(screen.getByText('450 pts')).toBeInTheDocument();
    expect(screen.getByText('300 pts')).toBeInTheDocument();
  });

  it('handles sign out button click', async () => {
    vi.mocked(authClient.signOut).mockResolvedValue({
      data: { success: true },
      error: null,
    });
    render(<DashboardView />);

    const signOutBtn = screen.getByRole('button', { name: /sair/i });
    fireEvent.click(signOutBtn);

    await waitFor(() => {
      expect(authClient.signOut).toHaveBeenCalled();
    });
  });

  it('responds to realtime socket events for snapshot, alert, status, and tiktok', () => {
    render(<DashboardView />);

    // Test snapshot listener
    snapshotListeners.forEach((fn) => fn(mockSnapshot));
    expect(useDashboardStore.getState().snapshot).toEqual(mockSnapshot);

    // Test alert listener
    const alert: ContributionAlert = {
      userId: 'u1',
      userName: 'LiveGamer',
      resourceKey: 'rose',
      units: 1,
      timestamp: Date.now(),
    };
    alertListeners.forEach((fn) => fn(alert));
    expect(useDashboardStore.getState().activeAlerts.length).toBe(1);

    // Test status change listener
    statusListeners.forEach((fn) => fn(true));
    expect(useDashboardStore.getState().isConnected).toBe(true);

    // Test tiktok connected event
    tiktokListeners.forEach((fn) =>
      fn({
        type: 'tiktok:connected',
        payload: { username: 'streamer99', sessionId: 'sess-view-1' },
      }),
    );
    expect(useDashboardStore.getState().tiktokStatus.status).toBe('connected');

    // Test tiktok disconnected event
    tiktokListeners.forEach((fn) =>
      fn({
        type: 'tiktok:disconnected',
        payload: {},
      }),
    );
    expect(useDashboardStore.getState().tiktokStatus.status).toBe(
      'disconnected',
    );
  });
});
