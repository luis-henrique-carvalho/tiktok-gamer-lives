import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getOverlayRenderer } from '../overlay-renderer-registry';
import { NeonArenaTheme } from '../../themes/neon-arena-theme';
import { MinimalTheme } from '../../themes/minimal-theme';

describe('overlay-renderer-registry', () => {
  it('returns NeonArenaTheme for axb and neon theme', () => {
    const Renderer = getOverlayRenderer('axb', 'neon');
    expect(Renderer).toBe(NeonArenaTheme);
  });

  it('returns MinimalTheme for axb and minimal theme', () => {
    const Renderer = getOverlayRenderer('axb', 'minimal');
    expect(Renderer).toBe(MinimalTheme);
  });

  it('defaults to axb and neon when gameId is null', () => {
    const Renderer = getOverlayRenderer(null, 'neon');
    expect(Renderer).toBe(NeonArenaTheme);
  });

  it('renders fallback for unsupported game', () => {
    const UnsupportedRenderer = getOverlayRenderer('unknown_chess', 'neon');
    render(
      <UnsupportedRenderer
        projection={null}
        config={null}
        alerts={[]}
        celebration={null}
        mode="simulation"
      />,
    );

    expect(screen.getByText('Jogo não suportado')).toBeInTheDocument();
    expect(screen.getByText(/unknown_chess/)).toBeInTheDocument();
  });
});
