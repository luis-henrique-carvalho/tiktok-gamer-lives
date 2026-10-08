import { render, screen, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { OverlayView } from '../overlay-view';
import { useOverlayStore } from '../../stores/use-overlay-store';
import * as apiClient from '@/api/client';
import type { AxBConfig, GameSession } from '@/api/types';

vi.mock('@/api/client', () => ({
  getSession: vi.fn(),
}));

const mockConfig: AxBConfig = {
  teamA: { id: 'A', name: 'Alpha', color: '#ff4444' },
  teamB: { id: 'B', name: 'Beta', color: '#00d2ff' },
  scoreGoal: 1000,
  commentCooldownMs: 1000,
  intervalDurationMs: 5000,
  giftRules: [{ resourceKey: 'rose', targetTeam: 'A', pointsPerUnit: 10 }],
};

const mockSession: GameSession = {
  id: 'sess-test',
  gameId: 'axb',
  operatorId: 'op-1',
  status: 'RUNNING',
  title: 'Test Session',
  config: mockConfig,
  startedAt: '2026-10-08T10:00:00.000Z',
  endedAt: null,
  createdAt: '2026-10-08T10:00:00.000Z',
  updatedAt: '2026-10-08T10:00:00.000Z',
};

describe('OverlayView', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    useOverlayStore.getState().reset();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.mocked(apiClient.getSession).mockResolvedValue(mockSession);
  });

  function wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  it('renders empty prompt when sessionId is not provided', () => {
    render(
      <OverlayView
        search={{
          sessionId: null,
          theme: 'neon',
          mode: 'simulation',
          volume: 0.6,
          muted: false,
        }}
      />,
      { wrapper },
    );

    expect(screen.getByText('Sessão não especificada')).toBeInTheDocument();
    expect(
      screen.getByText(/Abra este overlay pelo link gerado/),
    ).toBeInTheDocument();
  });

  it('adds and removes overlay-transparent class on html documentElement', () => {
    expect(
      document.documentElement.classList.contains('overlay-transparent'),
    ).toBe(false);

    const { unmount } = render(
      <OverlayView
        search={{
          sessionId: 'sess-test',
          theme: 'neon',
          mode: 'simulation',
          volume: 0.6,
          muted: false,
        }}
      />,
      { wrapper },
    );

    expect(
      document.documentElement.classList.contains('overlay-transparent'),
    ).toBe(true);

    unmount();
    expect(
      document.documentElement.classList.contains('overlay-transparent'),
    ).toBe(false);
  });

  it('displays SIMULAÇÃO badge in simulation mode', async () => {
    render(
      <OverlayView
        search={{
          sessionId: 'sess-test',
          theme: 'neon',
          mode: 'simulation',
          volume: 0.6,
          muted: false,
        }}
      />,
      { wrapper },
    );

    expect(screen.getByText('SIMULAÇÃO')).toBeInTheDocument();
  });

  it('hides SIMULAÇÃO badge in live mode', () => {
    render(
      <OverlayView
        search={{
          sessionId: 'sess-test',
          theme: 'neon',
          mode: 'live',
          volume: 0.6,
          muted: false,
        }}
      />,
      { wrapper },
    );

    expect(screen.queryByText('SIMULAÇÃO')).not.toBeInTheDocument();
  });

  it('shows Pausado badge when projection is paused', () => {
    render(
      <OverlayView
        search={{
          sessionId: 'sess-test',
          theme: 'neon',
          mode: 'simulation',
          volume: 0.6,
          muted: false,
        }}
      />,
      { wrapper },
    );

    act(() => {
      useOverlayStore.getState().applyProjection({
        round: 1,
        roundStatus: 'ACTIVE',
        scoreGoal: 1000,
        teamA: {
          id: 'A',
          name: 'Alpha',
          color: '#f00',
          score: 10,
          wins: 0,
          progressPercentage: 1,
          relativePercentage: 50,
        },
        teamB: {
          id: 'B',
          name: 'Beta',
          color: '#00f',
          score: 10,
          wins: 0,
          progressPercentage: 1,
          relativePercentage: 50,
        },
        history: [],
        isPaused: true,
        pendingCount: 0,
        lastWinner: null,
      });
    });

    expect(screen.getByText('Pausado')).toBeInTheDocument();
  });

  it('shows Reconectando badge when disconnected', () => {
    render(
      <OverlayView
        search={{
          sessionId: 'sess-test',
          theme: 'neon',
          mode: 'simulation',
          volume: 0.6,
          muted: false,
        }}
      />,
      { wrapper },
    );

    act(() => {
      useOverlayStore.getState().setConnected(false);
    });

    expect(screen.getByText('Reconectando…')).toBeInTheDocument();
  });
});
