import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SimulatorPanel } from '../simulator-panel';
import { useDashboardStore } from '../../stores/use-dashboard-store';
import * as apiClient from '@/api/client';
import { toast } from 'sonner';
import type { GameSession } from '@/api/types';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/api/client', () => ({
  startSimulator: vi.fn(),
  stopSimulator: vi.fn(),
  burstSimulator: vi.fn(),
}));

describe('SimulatorPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDashboardStore.getState().reset();
  });

  const baseSession: GameSession = {
    id: 'sess-sim-1',
    gameId: 'axb',
    operatorId: 'op-1',
    status: 'RUNNING',
    title: 'Sim Session',
    config: {},
    startedAt: null,
    endedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('triggers CA-11 stress burst traffic', async () => {
    useDashboardStore.getState().setSession(baseSession);
    vi.mocked(apiClient.burstSimulator).mockResolvedValue({
      status: 'burst_completed',
      sessionId: 'sess-sim-1',
      totalGenerated: 200,
    });

    render(<SimulatorPanel />);

    const burstBtn = screen.getByRole('button', {
      name: /disparar rajada ca-11/i,
    });
    fireEvent.click(burstBtn);

    await waitFor(() => {
      expect(apiClient.burstSimulator).toHaveBeenCalledWith({
        sessionId: 'sess-sim-1',
        totalEvents: 200,
        eventsPerSecond: 200,
      });
      expect(toast.success).toHaveBeenCalledWith(
        'Rajada de 200 eventos disparada!',
      );
    });
  });

  it('starts and stops continuous synthetic traffic', async () => {
    useDashboardStore.getState().setSession(baseSession);
    vi.mocked(apiClient.startSimulator).mockResolvedValue({
      status: 'started',
      sessionId: 'sess-sim-1',
      eventsPerSecond: 20,
    });
    vi.mocked(apiClient.stopSimulator).mockResolvedValue({
      status: 'stopped',
    });

    render(<SimulatorPanel />);

    const startTrafficBtn = screen.getByRole('button', {
      name: /iniciar tráfego contínuo/i,
    });
    fireEvent.click(startTrafficBtn);

    await waitFor(() => {
      expect(apiClient.startSimulator).toHaveBeenCalledWith({
        sessionId: 'sess-sim-1',
        eventsPerSecond: 20,
      });
      expect(toast.success).toHaveBeenCalledWith(
        'Tráfego contínuo iniciado (20 ev/s)',
      );
    });

    const stopTrafficBtn = screen.getByRole('button', {
      name: /parar tráfego contínuo/i,
    });
    fireEvent.click(stopTrafficBtn);

    await waitFor(() => {
      expect(apiClient.stopSimulator).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Tráfego contínuo pausado');
    });
  });

  it('shows error toast when triggering simulator without active session', () => {
    render(<SimulatorPanel />);

    const burstBtn = screen.getByRole('button', {
      name: /disparar rajada ca-11/i,
    });
    fireEvent.click(burstBtn);

    expect(toast.error).toHaveBeenCalledWith(
      'Selecione ou crie uma sessão ativa primeiro',
    );
    expect(apiClient.burstSimulator).not.toHaveBeenCalled();
  });
});
