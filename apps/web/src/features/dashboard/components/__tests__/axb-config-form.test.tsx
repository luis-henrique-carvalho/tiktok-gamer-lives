import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AxBConfigForm } from '../axb-config-form';
import { useDashboardStore } from '../../stores/use-dashboard-store';
import * as apiClient from '@/api/client';
import { realtimeClient } from '@/lib/socket-client';
import { toast } from 'sonner';
import type { GameSession } from '@/api/types';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/api/client', () => ({
  createSession: vi.fn(),
}));

vi.mock('@/lib/socket-client', () => ({
  realtimeClient: {
    joinSession: vi.fn(),
    connect: vi.fn(),
  },
}));

describe('AxBConfigForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDashboardStore.getState().reset();
  });

  it('renders default form fields with initial values', () => {
    render(<AxBConfigForm />);

    expect(screen.getByLabelText(/título da partida/i)).toHaveValue(
      'Batalha A x B',
    );
    expect(screen.getByLabelText(/nome do time a/i)).toHaveValue(
      'Time Vermelho',
    );
    expect(screen.getByLabelText(/nome do time b/i)).toHaveValue('Time Azul');
    expect(screen.getByLabelText(/meta de pontos/i)).toHaveValue(1000);
    expect(
      screen.getByRole('button', { name: /criar sessão a x b/i }),
    ).toBeInTheDocument();
  });

  it('submits form, calls createSession, joins socket room and updates store', async () => {
    const mockCreatedSession: GameSession = {
      id: 'new-sess-1',
      gameId: 'axb',
      operatorId: 'operator-default',
      status: 'CONFIGURING',
      title: 'Batalha das Estrelas',
      config: {
        teamA: { id: 'A', name: 'Leões', color: '#ff0000' },
        teamB: { id: 'B', name: 'Tigres', color: '#0000ff' },
        scoreGoal: 500,
        commentCooldownMs: 1000,
        intervalDurationMs: 5000,
        giftRules: [],
      },
      startedAt: null,
      endedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vi.mocked(apiClient.createSession).mockResolvedValue(mockCreatedSession);

    render(<AxBConfigForm />);

    fireEvent.change(screen.getByLabelText(/título da partida/i), {
      target: { value: 'Batalha das Estrelas' },
    });
    fireEvent.change(screen.getByLabelText(/nome do time a/i), {
      target: { value: 'Leões' },
    });
    fireEvent.change(screen.getByLabelText(/nome do time b/i), {
      target: { value: 'Tigres' },
    });
    fireEvent.change(screen.getByLabelText(/meta de pontos/i), {
      target: { value: '500' },
    });

    fireEvent.click(
      screen.getByRole('button', { name: /criar sessão a x b/i }),
    );

    await waitFor(() => {
      expect(apiClient.createSession).toHaveBeenCalledWith({
        gameId: 'axb',
        operatorId: 'operator-default',
        title: 'Batalha das Estrelas',
        config: expect.objectContaining({
          teamA: expect.objectContaining({ name: 'Leões' }),
          teamB: expect.objectContaining({ name: 'Tigres' }),
          scoreGoal: 500,
        }),
      });
      expect(realtimeClient.joinSession).toHaveBeenCalledWith('new-sess-1');
      expect(toast.success).toHaveBeenCalledWith(
        'Sessão A x B criada com sucesso!',
      );
      expect(useDashboardStore.getState().session?.id).toBe('new-sess-1');
    });
  });

  it('handles API error during session creation', async () => {
    vi.mocked(apiClient.createSession).mockRejectedValue(
      new Error('Falha no servidor'),
    );

    render(<AxBConfigForm />);
    fireEvent.click(
      screen.getByRole('button', { name: /criar sessão a x b/i }),
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Falha no servidor');
    });
  });
});
