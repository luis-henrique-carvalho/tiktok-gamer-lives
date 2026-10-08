import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MatchScoreboardCard } from '../match-scoreboard-card';
import type { AxBProjection } from '@/api/types';

describe('MatchScoreboardCard', () => {
  it('renders placeholder when projection is null', () => {
    render(<MatchScoreboardCard projection={null} />);

    expect(screen.getByText('Placar em Espera')).toBeInTheDocument();
    expect(screen.getByText('Sem Partida')).toBeInTheDocument();
    expect(
      screen.getByText(/Nenhuma partida ativa\. Crie ou inicie uma sessão/),
    ).toBeInTheDocument();
  });

  it('renders live match scoreboard when projection is provided', () => {
    const mockProjection: AxBProjection = {
      round: 3,
      roundStatus: 'ACTIVE',
      scoreGoal: 1000,
      teamA: {
        id: 'A',
        name: 'Dragões Vermelhos',
        color: '#EF4444',
        score: 750,
        wins: 2,
        progressPercentage: 75,
        relativePercentage: 60,
      },
      teamB: {
        id: 'B',
        name: 'Guerreiros Azuis',
        color: '#3B82F6',
        score: 500,
        wins: 1,
        progressPercentage: 50,
        relativePercentage: 40,
      },
      history: [],
      isPaused: false,
      pendingCount: 0,
      lastWinner: 'A',
    };

    render(
      <MatchScoreboardCard
        projection={mockProjection}
        sessionStatus="RUNNING"
      />,
    );

    expect(
      screen.getByText('Rodada #3 — Placar em Tempo Real'),
    ).toBeInTheDocument();
    expect(screen.getByText('EM ANDAMENTO')).toBeInTheDocument();
    expect(screen.getByText('Meta: 1000 pts')).toBeInTheDocument();
    expect(screen.getByText(/Dragões Vermelhos \(2V\)/)).toBeInTheDocument();
    expect(screen.getByText('750 pts')).toBeInTheDocument();
    expect(screen.getByText(/Guerreiros Azuis \(1V\)/)).toBeInTheDocument();
    expect(screen.getByText('500 pts')).toBeInTheDocument();
  });

  it('renders paused status correctly', () => {
    const mockProjection: AxBProjection = {
      round: 1,
      roundStatus: 'ACTIVE',
      scoreGoal: 500,
      teamA: {
        id: 'A',
        name: 'Time A',
        color: '#EF4444',
        score: 0,
        wins: 0,
        progressPercentage: 0,
        relativePercentage: 50,
      },
      teamB: {
        id: 'B',
        name: 'Time B',
        color: '#3B82F6',
        score: 0,
        wins: 0,
        progressPercentage: 0,
        relativePercentage: 50,
      },
      history: [],
      isPaused: true,
      pendingCount: 0,
      lastWinner: null,
    };

    render(
      <MatchScoreboardCard
        projection={mockProjection}
        sessionStatus="PAUSED"
      />,
    );

    expect(screen.getByText('PAUSADO')).toBeInTheDocument();
  });

  it('renders paused status with pending gifts count', () => {
    const singlePendingProjection: AxBProjection = {
      round: 1,
      roundStatus: 'ACTIVE',
      scoreGoal: 500,
      teamA: {
        id: 'A',
        name: 'Time A',
        color: '#EF4444',
        score: 100,
        wins: 0,
        progressPercentage: 20,
        relativePercentage: 50,
      },
      teamB: {
        id: 'B',
        name: 'Time B',
        color: '#3B82F6',
        score: 100,
        wins: 0,
        progressPercentage: 20,
        relativePercentage: 50,
      },
      history: [],
      isPaused: true,
      pendingCount: 1,
      lastWinner: null,
    };

    const { unmount } = render(
      <MatchScoreboardCard
        projection={singlePendingProjection}
        sessionStatus="PAUSED"
      />,
    );

    expect(
      screen.getByText('PAUSADO • 1 presente em espera'),
    ).toBeInTheDocument();
    unmount();

    const multiplePendingProjection: AxBProjection = {
      ...singlePendingProjection,
      pendingCount: 3,
    };

    render(
      <MatchScoreboardCard
        projection={multiplePendingProjection}
        sessionStatus="PAUSED"
      />,
    );

    expect(
      screen.getByText('PAUSADO • 3 presentes em espera'),
    ).toBeInTheDocument();
  });

  it('renders ended status correctly with destructive badge', () => {
    const mockProjection: AxBProjection = {
      round: 2,
      roundStatus: 'ENDED',
      scoreGoal: 1000,
      teamA: {
        id: 'A',
        name: 'Time A',
        color: '#EF4444',
        score: 1000,
        wins: 2,
        progressPercentage: 100,
        relativePercentage: 60,
      },
      teamB: {
        id: 'B',
        name: 'Time B',
        color: '#3B82F6',
        score: 650,
        wins: 1,
        progressPercentage: 65,
        relativePercentage: 40,
      },
      history: [],
      isPaused: false,
      pendingCount: 0,
      lastWinner: 'A',
    };

    render(
      <MatchScoreboardCard projection={mockProjection} sessionStatus="ENDED" />,
    );

    const badge = screen.getByText('ENCERRADO');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('data-variant', 'destructive');
    expect(badge).toHaveClass('bg-destructive');
  });

  it('renders default awaiting status when status is not RUNNING, PAUSED or ENDED', () => {
    const mockProjection: AxBProjection = {
      round: 1,
      roundStatus: 'ACTIVE',
      scoreGoal: 1000,
      teamA: {
        id: 'A',
        name: 'Time A',
        color: '#EF4444',
        score: 0,
        wins: 0,
        progressPercentage: 0,
        relativePercentage: 50,
      },
      teamB: {
        id: 'B',
        name: 'Time B',
        color: '#3B82F6',
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

    render(
      <MatchScoreboardCard
        projection={mockProjection}
        sessionStatus="CONFIGURING"
      />,
    );

    const badge = screen.getByText('AGUARDANDO INÍCIO');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('data-variant', 'secondary');
  });

  it('renders interval status with winner announcement', () => {
    const mockProjection: AxBProjection = {
      round: 1,
      roundStatus: 'INTERVAL',
      scoreGoal: 1000,
      teamA: {
        id: 'A',
        name: 'Time Vermelho',
        color: '#EF4444',
        score: 1018,
        wins: 1,
        progressPercentage: 100,
        relativePercentage: 58,
      },
      teamB: {
        id: 'B',
        name: 'Time Azul',
        color: '#3B82F6',
        score: 750,
        wins: 0,
        progressPercentage: 75,
        relativePercentage: 42,
      },
      history: [
        {
          roundNumber: 1,
          winner: 'A',
          finalScore: { teamA: 1018, teamB: 750 },
          completedAt: Date.now(),
        },
      ],
      isPaused: false,
      pendingCount: 0,
      lastWinner: 'A',
    };

    render(
      <MatchScoreboardCard
        projection={mockProjection}
        sessionStatus="RUNNING"
      />,
    );

    expect(
      screen.getByText('INTERVALO • Vitória: Time Vermelho'),
    ).toBeInTheDocument();
    expect(screen.getByText('Rodadas anteriores:')).toBeInTheDocument();
    expect(screen.getByText('R1:')).toBeInTheDocument();
    expect(screen.getByText('(1018x750)')).toBeInTheDocument();
  });
});
