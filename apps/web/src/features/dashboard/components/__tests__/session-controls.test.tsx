import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SessionControls } from '../session-controls';
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
  startSession: vi.fn(),
  pauseSession: vi.fn(),
  resumeSession: vi.fn(),
  endSession: vi.fn(),
}));

describe('SessionControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDashboardStore.getState().reset();
  });

  const baseSession: GameSession = {
    id: 'sess-123',
    gameId: 'axb',
    operatorId: 'op-1',
    status: 'CONFIGURING',
    title: 'Batalha dos Clãs',
    config: {},
    startedAt: null,
    endedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('renders "Nenhuma sessão ativa" when session is null', () => {
    render(<SessionControls />);
    expect(screen.getByText(/nenhuma sessão selecionada/i)).toBeInTheDocument();
  });

  it('renders session info and Start button when status is CONFIGURING', async () => {
    useDashboardStore.getState().setSession(baseSession);
    vi.mocked(apiClient.startSession).mockResolvedValue({
      ...baseSession,
      status: 'RUNNING',
    });

    render(<SessionControls />);
    expect(screen.getByText('Batalha dos Clãs')).toBeInTheDocument();
    expect(screen.getByText('CONFIGURANDO')).toBeInTheDocument();

    const startBtn = screen.getByRole('button', { name: /iniciar partida/i });
    expect(startBtn).toBeInTheDocument();

    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(apiClient.startSession).toHaveBeenCalledWith('sess-123');
      expect(toast.success).toHaveBeenCalledWith(
        'Partida iniciada com sucesso!',
      );
      expect(useDashboardStore.getState().session?.status).toBe('RUNNING');
    });
  });

  it('renders Pause and End buttons when status is RUNNING', async () => {
    useDashboardStore.getState().setSession({
      ...baseSession,
      status: 'RUNNING',
    });
    vi.mocked(apiClient.pauseSession).mockResolvedValue({
      ...baseSession,
      status: 'PAUSED',
    });

    render(<SessionControls />);
    expect(screen.getByText('EM ANDAMENTO')).toBeInTheDocument();

    const pauseBtn = screen.getByRole('button', { name: /pausar/i });
    const endBtn = screen.getByRole('button', { name: /encerrar/i });
    expect(pauseBtn).toBeInTheDocument();
    expect(endBtn).toBeInTheDocument();

    fireEvent.click(pauseBtn);

    await waitFor(() => {
      expect(apiClient.pauseSession).toHaveBeenCalledWith('sess-123');
      expect(toast.success).toHaveBeenCalledWith('Partida pausada');
      expect(useDashboardStore.getState().session?.status).toBe('PAUSED');
    });
  });

  it('renders Resume and End buttons when status is PAUSED', async () => {
    useDashboardStore.getState().setSession({
      ...baseSession,
      status: 'PAUSED',
    });
    vi.mocked(apiClient.resumeSession).mockResolvedValue({
      session: { ...baseSession, status: 'RUNNING' },
      drainedCount: 3,
    });

    render(<SessionControls />);
    expect(screen.getByText('PAUSADO')).toBeInTheDocument();

    const resumeBtn = screen.getByRole('button', { name: /retomar/i });
    expect(resumeBtn).toBeInTheDocument();

    fireEvent.click(resumeBtn);

    await waitFor(() => {
      expect(apiClient.resumeSession).toHaveBeenCalledWith('sess-123');
      expect(toast.success).toHaveBeenCalledWith(
        'Partida retomada (3 drenados)',
      );
      expect(useDashboardStore.getState().session?.status).toBe('RUNNING');
    });
  });

  it('handles End Session with confirmation dialog', async () => {
    useDashboardStore.getState().setSession({
      ...baseSession,
      status: 'RUNNING',
    });
    vi.mocked(apiClient.endSession).mockResolvedValue({
      ...baseSession,
      status: 'ENDED',
    });

    render(<SessionControls />);
    const endBtn = screen.getByRole('button', { name: /encerrar/i });
    fireEvent.click(endBtn);

    const confirmBtn = await screen.findByRole('button', {
      name: /confirmar encerramento/i,
    });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(apiClient.endSession).toHaveBeenCalledWith('sess-123');
      expect(toast.success).toHaveBeenCalledWith('Partida encerrada');
      expect(useDashboardStore.getState().session?.status).toBe('ENDED');
    });
  });
});
