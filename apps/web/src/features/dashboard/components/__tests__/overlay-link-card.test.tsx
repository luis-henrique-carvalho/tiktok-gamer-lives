import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { OverlayLinkCard } from '../overlay-link-card';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('OverlayLinkCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders card title, controls and disables buttons when no session is active', () => {
    render(<OverlayLinkCard sessionId={null} isTikTokConnected={false} />);

    expect(screen.getByText('Link do Overlay OBS')).toBeInTheDocument();
    expect(screen.getByText('Tema Visual')).toBeInTheDocument();
    expect(screen.getByText('Modo de Operação')).toBeInTheDocument();

    const copyBtn = screen.getByRole('button', { name: /Copiar URL/i });
    const openBtn = screen.getByRole('button', { name: /Abrir/i });

    expect(copyBtn).toBeDisabled();
    expect(openBtn).toBeDisabled();
  });

  it('enables action buttons and copies generated URL to clipboard', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <OverlayLinkCard sessionId="session-abc" isTikTokConnected={false} />,
    );

    const copyBtn = screen.getByRole('button', { name: /Copiar URL/i });
    const openBtn = screen.getByRole('button', { name: /Abrir/i });

    expect(copyBtn).toBeEnabled();
    expect(openBtn).toBeEnabled();

    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringContaining('sessionId=session-abc'),
    );
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('URL do Overlay copiada'),
    );
  });

  it('opens overlay in new window when Abrir button is clicked', () => {
    const windowOpenSpy = vi
      .spyOn(window, 'open')
      .mockImplementation(() => null);

    render(
      <OverlayLinkCard sessionId="session-xyz" isTikTokConnected={false} />,
    );

    const openBtn = screen.getByRole('button', { name: /Abrir/i });
    fireEvent.click(openBtn);

    expect(windowOpenSpy).toHaveBeenCalledWith(
      expect.stringContaining('sessionId=session-xyz'),
      '_blank',
      'noopener,noreferrer',
    );
  });
});
