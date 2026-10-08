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
  sendManualVote: vi.fn(),
  sendManualGift: vi.fn(),
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

  it('disables simulation controls when there is no active session', () => {
    render(<SimulatorPanel />);

    const burstBtn = screen.getByRole('button', {
      name: /disparar rajada ca-11/i,
    });
    const trafficBtn = screen.getByRole('button', {
      name: /iniciar tráfego contínuo/i,
    });
    const rateInput = screen.getByLabelText(/taxa de eventos/i);

    expect(burstBtn).toBeDisabled();
    expect(trafficBtn).toBeDisabled();
    expect(rateInput).toBeDisabled();

    expect(
      screen.getByRole('button', { name: /votar a \(\+1 pt\)/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /votar b \(\+1 pt\)/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /presente a \(\+10 pts\)/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /presente b \(\+10 pts\)/i }),
    ).toBeDisabled();
    expect(
      screen.getByLabelText(/usuário simulado \(opcional\)/i),
    ).toBeDisabled();
    expect(screen.getByLabelText(/unidades do presente/i)).toBeDisabled();
  });

  it('disables simulation controls when session is ENDED', () => {
    useDashboardStore.getState().setSession({
      ...baseSession,
      status: 'ENDED',
    });

    render(<SimulatorPanel />);

    const burstBtn = screen.getByRole('button', {
      name: /disparar rajada ca-11/i,
    });
    const trafficBtn = screen.getByRole('button', {
      name: /iniciar tráfego contínuo/i,
    });
    const rateInput = screen.getByLabelText(/taxa de eventos/i);

    expect(burstBtn).toBeDisabled();
    expect(trafficBtn).toBeDisabled();
    expect(rateInput).toBeDisabled();

    expect(
      screen.getByRole('button', { name: /votar a \(\+1 pt\)/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /votar b \(\+1 pt\)/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /presente a \(\+10 pts\)/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /presente b \(\+10 pts\)/i }),
    ).toBeDisabled();
  });

  it('disables simulation controls when session is not RUNNING (e.g. PAUSED or CONFIGURING)', () => {
    useDashboardStore.getState().setSession({
      ...baseSession,
      status: 'PAUSED',
    });

    const { rerender } = render(<SimulatorPanel />);

    expect(
      screen.getByRole('button', { name: /disparar rajada ca-11/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /iniciar tráfego contínuo/i }),
    ).toBeDisabled();
    expect(screen.getByLabelText(/taxa de eventos/i)).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /votar a \(\+1 pt\)/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /votar b \(\+1 pt\)/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /presente a \(\+10 pts\)/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /presente b \(\+10 pts\)/i }),
    ).toBeDisabled();

    useDashboardStore.getState().setSession({
      ...baseSession,
      status: 'CONFIGURING',
    });
    rerender(<SimulatorPanel />);

    expect(
      screen.getByRole('button', { name: /disparar rajada ca-11/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /iniciar tráfego contínuo/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /votar a \(\+1 pt\)/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /votar b \(\+1 pt\)/i }),
    ).toBeDisabled();
  });

  it('handles burst error gracefully with Error and unknown error types', async () => {
    useDashboardStore.getState().setSession(baseSession);
    vi.mocked(apiClient.burstSimulator).mockRejectedValueOnce(
      new Error('Redis timeout'),
    );

    render(<SimulatorPanel />);

    const burstBtn = screen.getByRole('button', {
      name: /disparar rajada ca-11/i,
    });
    fireEvent.click(burstBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Redis timeout');
    });

    vi.mocked(apiClient.burstSimulator).mockRejectedValueOnce('Network crash');
    fireEvent.click(burstBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Falha ao disparar rajada');
    });
  });

  it('handles continuous traffic start and stop errors', async () => {
    useDashboardStore.getState().setSession(baseSession);
    vi.mocked(apiClient.startSimulator).mockRejectedValueOnce(
      new Error('Engine offline'),
    );

    render(<SimulatorPanel />);

    const trafficBtn = screen.getByRole('button', {
      name: /iniciar tráfego contínuo/i,
    });
    fireEvent.click(trafficBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Engine offline');
    });

    vi.mocked(apiClient.startSimulator).mockRejectedValueOnce('Unknown issue');
    fireEvent.click(trafficBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Falha ao controlar tráfego');
    });
  });

  it('allows customizing event rate before starting continuous traffic', async () => {
    useDashboardStore.getState().setSession(baseSession);
    vi.mocked(apiClient.startSimulator).mockResolvedValue({
      status: 'started',
      sessionId: 'sess-sim-1',
      eventsPerSecond: 50,
    });

    render(<SimulatorPanel />);

    const rateInput = screen.getByLabelText(/taxa de eventos/i);
    fireEvent.change(rateInput, { target: { value: '50' } });

    const startBtn = screen.getByRole('button', {
      name: /iniciar tráfego contínuo/i,
    });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(apiClient.startSimulator).toHaveBeenCalledWith({
        sessionId: 'sess-sim-1',
        eventsPerSecond: 50,
      });
    });
  });

  it('resets continuous traffic state if session ends while running', async () => {
    useDashboardStore.getState().setSession(baseSession);
    vi.mocked(apiClient.startSimulator).mockResolvedValue({
      status: 'started',
      sessionId: 'sess-sim-1',
      eventsPerSecond: 20,
    });

    const { rerender } = render(<SimulatorPanel />);

    const startBtn = screen.getByRole('button', {
      name: /iniciar tráfego contínuo/i,
    });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(screen.getByText('TRÁFEGO ATIVO')).toBeInTheDocument();
    });

    // Session transitions to ENDED
    useDashboardStore.getState().setSession({
      ...baseSession,
      status: 'ENDED',
    });
    rerender(<SimulatorPanel />);

    await waitFor(() => {
      expect(screen.getByText('IDLE')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /iniciar tráfego contínuo/i }),
      ).toBeDisabled();
    });
  });

  it('sends 1-click manual vote for Team A with default settings', async () => {
    useDashboardStore.getState().setSession(baseSession);
    vi.mocked(apiClient.sendManualVote).mockResolvedValue({
      success: true,
    });

    render(<SimulatorPanel />);

    const voteABtn = screen.getByRole('button', {
      name: /votar a \(\+1 pt\)/i,
    });
    fireEvent.click(voteABtn);

    await waitFor(() => {
      expect(apiClient.sendManualVote).toHaveBeenCalledWith({
        sessionId: 'sess-sim-1',
        team: 'A',
      });
      expect(toast.success).toHaveBeenCalledWith(
        'Voto registrado para o Time A (+1 pt)',
      );
    });

    const logs = useDashboardStore.getState().eventsLog;
    expect(logs[0]?.text).toContain('Voto manual injetado no Time A (+1 pt)');
  });

  it('sends 1-click manual vote for Team B with simulated user', async () => {
    useDashboardStore.getState().setSession(baseSession);
    vi.mocked(apiClient.sendManualVote).mockResolvedValue({
      success: true,
      message: 'Voto customizado aceito!',
    });

    render(<SimulatorPanel />);

    const userInput = screen.getByLabelText(/usuário simulado \(opcional\)/i);
    fireEvent.change(userInput, { target: { value: '  user_pedro  ' } });

    const voteBBtn = screen.getByRole('button', {
      name: /votar b \(\+1 pt\)/i,
    });
    fireEvent.click(voteBBtn);

    await waitFor(() => {
      expect(apiClient.sendManualVote).toHaveBeenCalledWith({
        sessionId: 'sess-sim-1',
        team: 'B',
        userId: 'user_pedro',
        userName: 'user_pedro',
      });
      expect(toast.success).toHaveBeenCalledWith('Voto customizado aceito!');
    });

    const logs = useDashboardStore.getState().eventsLog;
    expect(logs[0]?.text).toContain('[user_pedro]');
  });

  it('sends 1-click manual gift for Team A with default units', async () => {
    useDashboardStore.getState().setSession(baseSession);
    vi.mocked(apiClient.sendManualGift).mockResolvedValue({
      success: true,
    });

    render(<SimulatorPanel />);

    const giftABtn = screen.getByRole('button', {
      name: /presente a \(\+10 pts\)/i,
    });
    fireEvent.click(giftABtn);

    await waitFor(() => {
      expect(apiClient.sendManualGift).toHaveBeenCalledWith({
        sessionId: 'sess-sim-1',
        team: 'A',
        units: 1,
      });
      expect(toast.success).toHaveBeenCalledWith(
        'Presente registrado para o Time A (+10 pts)',
      );
    });

    const logs = useDashboardStore.getState().eventsLog;
    expect(logs[0]?.text).toContain(
      'Presente manual (1x) injetado no Time A (+10 pts)',
    );
  });

  it('sends manual gift for Team B with custom units (5x) and simulated user', async () => {
    useDashboardStore.getState().setSession(baseSession);
    vi.mocked(apiClient.sendManualGift).mockResolvedValue({
      success: true,
    });

    render(<SimulatorPanel />);

    const userInput = screen.getByLabelText(/usuário simulado \(opcional\)/i);
    fireEvent.change(userInput, { target: { value: 'user_maria' } });

    const unitsInput = screen.getByLabelText(/unidades do presente/i);
    fireEvent.change(unitsInput, { target: { value: '5' } });

    const giftBBtn = screen.getByRole('button', {
      name: /presente b \(\+10 pts\)/i,
    });
    fireEvent.click(giftBBtn);

    await waitFor(() => {
      expect(apiClient.sendManualGift).toHaveBeenCalledWith({
        sessionId: 'sess-sim-1',
        team: 'B',
        units: 5,
        userId: 'user_maria',
        userName: 'user_maria',
      });
      expect(toast.success).toHaveBeenCalledWith(
        'Presente registrado para o Time B (+50 pts)',
      );
    });

    const logs = useDashboardStore.getState().eventsLog;
    expect(logs[0]?.text).toContain(
      'Presente manual (5x) injetado no Time B (+50 pts) [user_maria]',
    );
  });

  it('handles errors when manual vote or gift fails', async () => {
    useDashboardStore.getState().setSession(baseSession);
    vi.mocked(apiClient.sendManualVote).mockRejectedValueOnce(
      new Error('Cooldown ativo (5s)'),
    );

    render(<SimulatorPanel />);

    const voteABtn = screen.getByRole('button', {
      name: /votar a \(\+1 pt\)/i,
    });
    fireEvent.click(voteABtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Cooldown ativo (5s)');
    });

    vi.mocked(apiClient.sendManualVote).mockRejectedValueOnce(
      'Erro desconhecido',
    );
    fireEvent.click(voteABtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Falha ao registrar voto');
    });

    vi.mocked(apiClient.sendManualGift).mockRejectedValueOnce(
      new Error('Erro no engine de presentes'),
    );
    const giftBBtn = screen.getByRole('button', {
      name: /presente b \(\+10 pts\)/i,
    });
    fireEvent.click(giftBBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erro no engine de presentes');
    });

    vi.mocked(apiClient.sendManualGift).mockRejectedValueOnce(
      'Erro sem message',
    );
    fireEvent.click(giftBBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Falha ao registrar presente');
    });
  });
});
