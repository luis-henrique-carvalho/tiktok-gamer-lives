import type { ComponentType } from 'react';
import type { AxBConfig, AxBProjection } from '@/api/types';
import type {
  OverlayAlert,
  OverlayCelebration,
} from '../stores/use-overlay-store';
import type { OverlayMode, OverlayTheme } from '@/lib/overlay-url';
import { NeonArenaTheme } from '../themes/neon-arena-theme';
import { MinimalTheme } from '../themes/minimal-theme';
import { UnsupportedGameFallback } from './unsupported-game-fallback';

export interface AxBRendererProps {
  readonly projection: AxBProjection | null;
  readonly config: AxBConfig | null;
  readonly alerts: readonly OverlayAlert[];
  readonly celebration: OverlayCelebration | null;
  readonly mode: OverlayMode;
}

export const overlayRendererRegistry: Record<
  string,
  Record<OverlayTheme, ComponentType<AxBRendererProps>>
> = {
  axb: {
    neon: NeonArenaTheme,
    minimal: MinimalTheme,
  },
};

export function getOverlayRenderer(
  gameId: string | null,
  theme: OverlayTheme,
): ComponentType<AxBRendererProps> {
  const normalizedGameId = (gameId ?? 'axb').toLowerCase();
  const gameThemes = overlayRendererRegistry[normalizedGameId];

  if (!gameThemes) {
    return function UnsupportedRenderer() {
      return <UnsupportedGameFallback gameId={gameId} />;
    };
  }

  return gameThemes[theme] ?? gameThemes.neon;
}
