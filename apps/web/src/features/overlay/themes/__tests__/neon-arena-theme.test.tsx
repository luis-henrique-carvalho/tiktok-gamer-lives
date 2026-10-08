import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NeonArenaTheme } from '../neon-arena-theme';
import type { AxBConfig, AxBProjection } from '@/api/types';
import type {
  OverlayAlert,
  OverlayCelebration,
} from '../../stores/use-overlay-store';

const mockConfig: AxBConfig = {
  teamA: { id: 'A', name: 'Dragões Vermelhos', color: '#ff4444' },
  teamB: { id: 'B', name: 'Magos Azuis', color: '#00d2ff' },
  scoreGoal: 1000,
  commentCooldownMs: 2000,
  intervalDurationMs: 5000,
  giftRules: [
    { resourceKey: 'rose', targetTeam: 'A', pointsPerUnit: 10 },
    { resourceKey: 'coffee', targetTeam: 'B', pointsPerUnit: 50 },
  ],
};

const activeProjection: AxBProjection = {
  round: 2,
  roundStatus: 'ACTIVE',
  scoreGoal: 1000,
  teamA: {
    id: 'A',
    name: 'Dragões Vermelhos',
    color: '#ff4444',
    score: 450,
    wins: 1,
    progressPercentage: 45,
    relativePercentage: 45,
  },
  teamB: {
    id: 'B',
    name: 'Magos Azuis',
    color: '#00d2ff',
    score: 550,
    wins: 0,
    progressPercentage: 55,
    relativePercentage: 55,
  },
  history: [],
  isPaused: false,
  pendingCount: 0,
  lastWinner: null,
};

describe('NeonArenaTheme', () => {
  it('renders scoreboard, teams, scores and round info', () => {
    render(
      <NeonArenaTheme
        projection={activeProjection}
        config={mockConfig}
        alerts={[]}
        celebration={null}
        mode="simulation"
      />,
    );

    expect(screen.getByText('Rodada 2')).toBeInTheDocument();
    expect(screen.getByText(/Meta: 1.0k pts/)).toBeInTheDocument();
    expect(screen.getByText('Dragões Vermelhos')).toBeInTheDocument();
    expect(screen.getByText('Magos Azuis')).toBeInTheDocument();
    expect(screen.getByText('450')).toBeInTheDocument();
    expect(screen.getByText('550')).toBeInTheDocument();
  });

  it('shows CTA "Comente A ou B" when active and unpaused', () => {
    render(
      <NeonArenaTheme
        projection={activeProjection}
        config={mockConfig}
        alerts={[]}
        celebration={null}
        mode="simulation"
      />,
    );

    expect(screen.getByText(/Comente/)).toBeInTheDocument();
    expect(screen.getByText(/no chat!/)).toBeInTheDocument();
  });

  it('hides CTA when paused', () => {
    const pausedProjection = {
      ...activeProjection,
      isPaused: true,
    };

    render(
      <NeonArenaTheme
        projection={pausedProjection}
        config={mockConfig}
        alerts={[]}
        celebration={null}
        mode="simulation"
      />,
    );

    expect(screen.queryByText(/Comente/)).not.toBeInTheDocument();
  });

  it('hides CTA when in INTERVAL status', () => {
    const intervalProjection = {
      ...activeProjection,
      roundStatus: 'INTERVAL' as const,
    };

    render(
      <NeonArenaTheme
        projection={intervalProjection}
        config={mockConfig}
        alerts={[]}
        celebration={null}
        mode="simulation"
      />,
    );

    expect(screen.queryByText(/Comente/)).not.toBeInTheDocument();
  });

  it('renders gift rules configured in session', () => {
    render(
      <NeonArenaTheme
        projection={activeProjection}
        config={mockConfig}
        alerts={[]}
        celebration={null}
        mode="simulation"
      />,
    );

    expect(screen.getByText('Presentes')).toBeInTheDocument();
    expect(screen.getByText('rose')).toBeInTheDocument();
    expect(screen.getByText('+10')).toBeInTheDocument();
    expect(screen.getByText('coffee')).toBeInTheDocument();
    expect(screen.getByText('+50')).toBeInTheDocument();
  });

  it('renders contribution alert badge when alert is present', () => {
    const alert: OverlayAlert = {
      id: 'alert-1',
      groupKey: 'u1:rose',
      userId: 'u1',
      userName: 'SuperGamer',
      resourceKey: 'rose',
      units: 4,
      points: 40,
      team: 'A',
      timestamp: Date.now(),
      expiresAt: Date.now() + 4000,
    };

    render(
      <NeonArenaTheme
        projection={activeProjection}
        config={mockConfig}
        alerts={[alert]}
        celebration={null}
        mode="simulation"
      />,
    );

    expect(screen.getByText('SuperGamer')).toBeInTheDocument();
    expect(screen.getByText('x4')).toBeInTheDocument();
    expect(screen.getByText('+40')).toBeInTheDocument();
  });

  it('renders celebration banner when celebration is active', () => {
    const celebration: OverlayCelebration = {
      winner: 'A',
      endsAt: Date.now() + 5000,
      intervalDurationMs: 5000,
    };

    render(
      <NeonArenaTheme
        projection={activeProjection}
        config={mockConfig}
        alerts={[]}
        celebration={celebration}
        mode="simulation"
      />,
    );

    expect(screen.getByText('Fim de Rodada!')).toBeInTheDocument();
    expect(
      screen.getByText(/Vitória do Dragões Vermelhos!/),
    ).toBeInTheDocument();
  });
});
