import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MinimalTheme } from '../minimal-theme';
import type { AxBConfig, AxBProjection } from '@/api/types';
import type {
  OverlayAlert,
  OverlayCelebration,
} from '../../stores/use-overlay-store';

const mockConfig: AxBConfig = {
  teamA: { id: 'A', name: 'Spartanos', color: '#ff4444' },
  teamB: { id: 'B', name: 'Atenienses', color: '#00d2ff' },
  scoreGoal: 2000,
  commentCooldownMs: 2000,
  intervalDurationMs: 5000,
  giftRules: [{ resourceKey: 'diamond', targetTeam: 'A', pointsPerUnit: 100 }],
};

const activeProjection: AxBProjection = {
  round: 3,
  roundStatus: 'ACTIVE',
  scoreGoal: 2000,
  teamA: {
    id: 'A',
    name: 'Spartanos',
    color: '#ff4444',
    score: 1200,
    wins: 2,
    progressPercentage: 60,
    relativePercentage: 60,
  },
  teamB: {
    id: 'B',
    name: 'Atenienses',
    color: '#00d2ff',
    score: 800,
    wins: 0,
    progressPercentage: 40,
    relativePercentage: 40,
  },
  history: [],
  isPaused: false,
  pendingCount: 0,
  lastWinner: null,
};

describe('MinimalTheme', () => {
  it('renders sports broadcast scoreboard, teams, scores and round info', () => {
    render(
      <MinimalTheme
        projection={activeProjection}
        config={mockConfig}
        alerts={[]}
        celebration={null}
        mode="live"
      />,
    );

    expect(screen.getByText('Rodada 3')).toBeInTheDocument();
    expect(screen.getByText(/Meta: 2.0k pts/)).toBeInTheDocument();
    expect(screen.getByText('Spartanos')).toBeInTheDocument();
    expect(screen.getByText('Atenienses')).toBeInTheDocument();
    expect(screen.getByText('1.2k')).toBeInTheDocument();
    expect(screen.getByText('800')).toBeInTheDocument();
  });

  it('shows CTA "Vote no chat: A ou B" when active and unpaused', () => {
    render(
      <MinimalTheme
        projection={activeProjection}
        config={mockConfig}
        alerts={[]}
        celebration={null}
        mode="live"
      />,
    );

    expect(screen.getByText(/Vote no chat:/)).toBeInTheDocument();
  });

  it('hides CTA when paused or in interval', () => {
    const paused = { ...activeProjection, isPaused: true };
    const { rerender } = render(
      <MinimalTheme
        projection={paused}
        config={mockConfig}
        alerts={[]}
        celebration={null}
        mode="live"
      />,
    );
    expect(screen.queryByText(/Vote no chat:/)).not.toBeInTheDocument();

    const interval = { ...activeProjection, roundStatus: 'INTERVAL' as const };
    rerender(
      <MinimalTheme
        projection={interval}
        config={mockConfig}
        alerts={[]}
        celebration={null}
        mode="live"
      />,
    );
    expect(screen.queryByText(/Vote no chat:/)).not.toBeInTheDocument();
  });

  it('renders configured gift rules', () => {
    render(
      <MinimalTheme
        projection={activeProjection}
        config={mockConfig}
        alerts={[]}
        celebration={null}
        mode="live"
      />,
    );

    expect(screen.getByText(/diamond \(\+100\)/)).toBeInTheDocument();
  });

  it('renders contribution alert badge and celebration banner', () => {
    const alert: OverlayAlert = {
      id: 'alert-1',
      groupKey: 'u1:diamond',
      userId: 'u1',
      userName: 'LiveFan',
      resourceKey: 'diamond',
      units: 2,
      points: 200,
      team: 'A',
      timestamp: Date.now(),
      expiresAt: Date.now() + 4000,
    };

    const celebration: OverlayCelebration = {
      winner: 'A',
      endsAt: Date.now() + 5000,
      intervalDurationMs: 5000,
    };

    render(
      <MinimalTheme
        projection={activeProjection}
        config={mockConfig}
        alerts={[alert]}
        celebration={celebration}
        mode="live"
      />,
    );

    expect(screen.getByText('LiveFan')).toBeInTheDocument();
    expect(screen.getByText('x2')).toBeInTheDocument();
    expect(screen.getByText('+200')).toBeInTheDocument();
    expect(screen.getByText(/Vitória do Spartanos!/)).toBeInTheDocument();
  });
});
