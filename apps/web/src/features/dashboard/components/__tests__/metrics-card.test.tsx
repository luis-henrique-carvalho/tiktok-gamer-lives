import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricsCard } from '../metrics-card';
import { useDashboardStore } from '../../stores/use-dashboard-store';

describe('MetricsCard', () => {
  beforeEach(() => {
    useDashboardStore.getState().reset();
  });

  it('renders initial metric values', () => {
    render(<MetricsCard />);

    expect(screen.getByText('Telemetria & Desempenho')).toBeInTheDocument();
    expect(screen.getByText('Eventos Recebidos')).toBeInTheDocument();
    expect(screen.getByText('Throughput (ev/s)')).toBeInTheDocument();
    expect(screen.getByText('Snapshots / seg')).toBeInTheDocument();
    expect(screen.getByText('Latência')).toBeInTheDocument();
    expect(screen.getByText('Sequência')).toBeInTheDocument();
  });

  it('displays updated telemetry values from store', () => {
    useDashboardStore.getState().updateMetrics({
      eventsCount: 1540,
      eventsPerSecond: 198,
      snapshotsPerSecond: 59,
      latencyMs: 8,
      sequence: 450,
    });

    render(<MetricsCard />);

    expect(screen.getByText('1.540')).toBeInTheDocument();
    expect(screen.getByText('198/s')).toBeInTheDocument();
    expect(screen.getByText('59 fps')).toBeInTheDocument();
    expect(screen.getByText('8 ms')).toBeInTheDocument();
    expect(screen.getByText('#450')).toBeInTheDocument();
  });
});
