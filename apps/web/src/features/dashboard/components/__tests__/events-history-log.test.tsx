import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EventsHistoryLog } from '../events-history-log';
import { useDashboardStore } from '../../stores/use-dashboard-store';

describe('EventsHistoryLog', () => {
  beforeEach(() => {
    useDashboardStore.getState().reset();
  });

  it('renders empty state when no events in log', () => {
    render(<EventsHistoryLog />);

    expect(
      screen.getByText('Histórico de Eventos & Alertas'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Nenhum evento registrado ainda.'),
    ).toBeInTheDocument();
  });

  it('renders events and handles clear log button', () => {
    useDashboardStore.getState().addLogEvent({
      id: 'e-1',
      timestamp: 1700000000000,
      type: 'alert',
      text: 'GamerX enviou 5x Rosas!',
    });
    useDashboardStore.getState().addLogEvent({
      id: 'e-2',
      timestamp: 1700000001000,
      type: 'system',
      text: 'Partida iniciada',
    });

    render(<EventsHistoryLog />);

    expect(screen.getByText('GamerX enviou 5x Rosas!')).toBeInTheDocument();
    expect(screen.getByText('Partida iniciada')).toBeInTheDocument();

    const clearBtn = screen.getByRole('button', { name: /limpar/i });
    fireEvent.click(clearBtn);

    expect(
      screen.getByText('Nenhum evento registrado ainda.'),
    ).toBeInTheDocument();
  });
});
