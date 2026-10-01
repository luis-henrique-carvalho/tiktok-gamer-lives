import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TikTokConnectorCard } from '../tiktok-connector-card';
import { useDashboardStore } from '../../stores/use-dashboard-store';
import * as apiClient from '@/api/client';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/api/client', () => ({
  connectTikTok: vi.fn(),
  disconnectTikTok: vi.fn(),
  getTikTokStatus: vi.fn(),
}));

describe('TikTokConnectorCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDashboardStore.getState().reset();
  });

  it('renders disconnected state and connects streamer live', async () => {
    useDashboardStore.getState().setSession({
      id: 'sess-10',
      gameId: 'axb',
      operatorId: 'op-1',
      status: 'RUNNING',
      title: 'Live Battle',
      config: {},
      startedAt: null,
      endedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    vi.mocked(apiClient.connectTikTok).mockResolvedValue({
      status: 'connected',
      username: 'gamer_pro',
      sessionId: 'sess-10',
    });

    render(<TikTokConnectorCard />);

    expect(screen.getByText('DESCONECTADO')).toBeInTheDocument();
    const input = screen.getByPlaceholderText('@streamer_username');
    fireEvent.change(input, { target: { value: 'gamer_pro' } });

    const connectBtn = screen.getByRole('button', {
      name: /conectar à live/i,
    });
    fireEvent.click(connectBtn);

    await waitFor(() => {
      expect(apiClient.connectTikTok).toHaveBeenCalledWith({
        username: 'gamer_pro',
        sessionId: 'sess-10',
      });
      expect(toast.success).toHaveBeenCalledWith(
        'Conectado à Live de @gamer_pro',
      );
      expect(useDashboardStore.getState().tiktokStatus.status).toBe(
        'connected',
      );
    });
  });

  it('disconnects active TikTok connection', async () => {
    useDashboardStore.getState().setTikTokStatus({
      status: 'connected',
      username: 'gamer_pro',
      sessionId: 'sess-10',
    });

    vi.mocked(apiClient.disconnectTikTok).mockResolvedValue({
      status: 'disconnected',
    });

    render(<TikTokConnectorCard />);

    expect(screen.getByText('CONECTADO')).toBeInTheDocument();
    expect(screen.getByText('@gamer_pro')).toBeInTheDocument();

    const disconnectBtn = screen.getByRole('button', { name: /desconectar/i });
    fireEvent.click(disconnectBtn);

    await waitFor(() => {
      expect(apiClient.disconnectTikTok).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('TikTok Live desconectado');
      expect(useDashboardStore.getState().tiktokStatus.status).toBe(
        'disconnected',
      );
    });
  });

  it('shows warning when connecting without active session', () => {
    render(<TikTokConnectorCard />);
    const input = screen.getByPlaceholderText('@streamer_username');
    fireEvent.change(input, { target: { value: 'gamer_pro' } });

    const connectBtn = screen.getByRole('button', {
      name: /conectar à live/i,
    });
    fireEvent.click(connectBtn);

    expect(toast.error).toHaveBeenCalledWith(
      'Crie ou selecione uma sessão antes de conectar',
    );
    expect(apiClient.connectTikTok).not.toHaveBeenCalled();
  });
});
