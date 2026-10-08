import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PrototypeVariantA } from '../prototype-variant-a';
import { PrototypeVariantB } from '../prototype-variant-b';
import { PrototypeVariantC } from '../prototype-variant-c';
import { TileTower } from '../tile-tower';
import { SplitBackdrop } from '../split-backdrop';
import { TeamScoreTitle } from '../team-score-title';
import { GiftLegend } from '../gift-legend';
import { resolveScene } from '../prototype-shared';
import type { AxBConfig, AxBProjection } from '@/api/types';

const mockConfig: AxBConfig = {
  teamA: { id: 'A', name: 'Ronaldo', color: '#ef4444' },
  teamB: { id: 'B', name: 'Messi', color: '#3b82f6' },
  scoreGoal: 1000,
  commentCooldownMs: 2000,
  intervalDurationMs: 5000,
  giftRules: [
    { resourceKey: 'rose', targetTeam: 'A', pointsPerUnit: 10 },
    { resourceKey: 'coffee', targetTeam: 'B', pointsPerUnit: 50 },
    { resourceKey: 'tiktok:gift:5655', targetTeam: 'A', pointsPerUnit: 10 },
  ],
};

const mockProjection: AxBProjection = {
  round: 2,
  roundStatus: 'ACTIVE',
  scoreGoal: 1000,
  teamA: {
    id: 'A',
    name: 'Ronaldo',
    color: '#ef4444',
    score: 424,
    wins: 2,
    progressPercentage: 42,
    relativePercentage: 60,
  },
  teamB: {
    id: 'B',
    name: 'Messi',
    color: '#3b82f6',
    score: 270,
    wins: 1,
    progressPercentage: 27,
    relativePercentage: 40,
  },
  history: [],
  isPaused: false,
  pendingCount: 0,
  lastWinner: null,
};

describe('Prototype Themes and Components', () => {
  it('renders PrototypeVariantA faithfully with team titles, VS, and towers', () => {
    render(
      <PrototypeVariantA
        projection={mockProjection}
        config={mockConfig}
        alerts={[]}
        celebration={null}
        mode="simulation"
      />,
    );

    expect(screen.getByText('Ronaldo')).toBeInTheDocument();
    expect(screen.getByText('Messi')).toBeInTheDocument();
    expect(screen.getByText('424')).toBeInTheDocument();
    expect(screen.getByText('270')).toBeInTheDocument();
    expect(screen.getByText('VS')).toBeInTheDocument();
    expect(screen.getAllByTestId('tile-tower')).toHaveLength(2);
  });

  it('renders PrototypeVariantB with horizontal layout', () => {
    render(
      <PrototypeVariantB
        projection={mockProjection}
        config={mockConfig}
        alerts={[]}
        celebration={null}
        mode="simulation"
      />,
    );

    expect(screen.getByText('Ronaldo')).toBeInTheDocument();
    expect(screen.getByText('Messi')).toBeInTheDocument();
    expect(screen.getAllByTestId('tile-tower')).toHaveLength(2);
  });

  it('renders PrototypeVariantC transparent columns', () => {
    render(
      <PrototypeVariantC
        projection={mockProjection}
        config={mockConfig}
        alerts={[]}
        celebration={null}
        mode="simulation"
      />,
    );

    expect(screen.getByText('Ronaldo')).toBeInTheDocument();
    expect(screen.getByText('Messi')).toBeInTheDocument();
    expect(screen.getAllByTestId('tile-tower')).toHaveLength(2);
  });

  it('renders TileTower with specified tiles and background face', () => {
    render(<TileTower color="#ef4444" tiles={5} width={200} tileHeight={20} />);
    expect(screen.getByTestId('tile-tower')).toBeInTheDocument();
  });

  it('renders SplitBackdrop with custom colors', () => {
    const { container } = render(<SplitBackdrop colorA="#f00" colorB="#00f" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders TeamScoreTitle in small and large variants', () => {
    const { rerender } = render(
      <TeamScoreTitle team={mockProjection.teamA} size="lg" />,
    );
    expect(screen.getByText('Ronaldo')).toBeInTheDocument();
    expect(screen.getByText('VITÓRIAS 2')).toBeInTheDocument();

    rerender(<TeamScoreTitle team={mockProjection.teamB} size="sm" />);
    expect(screen.getByText('Messi')).toBeInTheDocument();
  });

  it('renders GiftLegend and cleans tiktok:gift prefix', () => {
    render(
      <GiftLegend
        rules={mockConfig.giftRules}
        color="#ef4444"
        direction="column"
      />,
    );
    expect(screen.getByText('rose')).toBeInTheDocument();
    expect(screen.getByText('ID 5655')).toBeInTheDocument();
    expect(screen.getAllByText('+10')).toHaveLength(2);
  });

  it('resolves scene safely even with null projection and config', () => {
    const scene = resolveScene(null, null);
    expect(scene.teamA.name).toBe('Time A');
    expect(scene.teamB.name).toBe('Time B');
    expect(scene.scoreGoal).toBe(1000);
    expect(scene.tilesA).toBe(0);
  });

  it('renders contribution alerts for Team A and Team B in bottom safe zones', () => {
    const alertA = {
      id: 'a1',
      groupKey: 'u1:rose',
      userId: 'u1',
      userName: 'FanRonaldo',
      resourceKey: 'rose',
      units: 2,
      points: 20,
      team: 'A' as const,
      timestamp: Date.now(),
      expiresAt: Date.now() + 4000,
    };
    const alertB = {
      id: 'a2',
      groupKey: 'u2:coffee',
      userId: 'u2',
      userName: 'FanMessi',
      resourceKey: 'coffee',
      units: 1,
      points: 75,
      team: 'B' as const,
      timestamp: Date.now(),
      expiresAt: Date.now() + 4000,
    };

    render(
      <PrototypeVariantA
        projection={mockProjection}
        config={mockConfig}
        alerts={[alertA, alertB]}
        celebration={null}
        mode="simulation"
      />,
    );

    expect(screen.getByText('FanRonaldo')).toBeInTheDocument();
    expect(screen.getByText('+20')).toBeInTheDocument();
    expect(screen.getByText('FanMessi')).toBeInTheDocument();
    expect(screen.getByText('+75')).toBeInTheDocument();
  });
});
