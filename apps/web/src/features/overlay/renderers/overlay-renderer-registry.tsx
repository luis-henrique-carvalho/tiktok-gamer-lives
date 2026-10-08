// shadcn-ignore: registry puro de componentes de renderização
import type { ComponentType } from 'react';
import type { AxBConfig, AxBProjection } from '@/api/types';
import type {
  OverlayAlert,
  OverlayCelebration,
} from '../stores/use-overlay-store';
import type { OverlayMode, OverlayTheme } from '@/lib/overlay-url';
import { NeonArenaTheme } from '../themes/neon-arena-theme';
import { MinimalTheme } from '../themes/minimal-theme';
import { PrototypeVariantA } from '../themes/prototype-variant-a';
import { PrototypeVariantB } from '../themes/prototype-variant-b';
import { PrototypeVariantC } from '../themes/prototype-variant-c';
import { UnsupportedGameFallback } from './unsupported-game-fallback';

export interface AxBRendererProps {
  readonly projection: AxBProjection | null;
  readonly config: AxBConfig | null;
  readonly alerts: readonly OverlayAlert[];
  readonly celebration: OverlayCelebration | null;
  readonly mode: OverlayMode;
}

export const prototypeVariants: Record<
  string,
  ComponentType<AxBRendererProps>
> = {
  A: PrototypeVariantA,
  B: PrototypeVariantB,
  C: PrototypeVariantC,
};

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
  variant?: string,
): ComponentType<AxBRendererProps> {
  if (variant && prototypeVariants[variant]) {
    return prototypeVariants[variant];
  }

  const normalizedGameId = (gameId ?? 'axb').toLowerCase();
  const gameThemes = overlayRendererRegistry[normalizedGameId];

  if (!gameThemes) {
    return function UnsupportedRenderer() {
      return <UnsupportedGameFallback gameId={gameId} />;
    };
  }

  return gameThemes[theme] ?? gameThemes.neon;
}
