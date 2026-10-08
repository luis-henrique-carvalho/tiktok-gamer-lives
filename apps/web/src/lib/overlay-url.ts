export type OverlayTheme = 'neon' | 'minimal';
export type OverlayMode = 'simulation' | 'live';
export type PrototypeVariantId = 'A' | 'B' | 'C' | 'none';

export interface OverlaySearch {
  readonly sessionId: string | null;
  readonly theme: OverlayTheme;
  readonly mode: OverlayMode;
  readonly volume: number;
  readonly muted: boolean;
  readonly variant?: PrototypeVariantId;
}

const DEFAULT_VOLUME = 0.6;
const DEFAULT_THEME: OverlayTheme = 'neon';
const DEFAULT_MODE: OverlayMode = 'simulation';

export function parseOverlaySearch(
  raw: Record<string, unknown>,
): OverlaySearch {
  let sessionId: string | null = null;
  if (typeof raw.sessionId === 'string') {
    const trimmed = raw.sessionId.trim();
    if (trimmed.length > 0) {
      sessionId = trimmed;
    }
  }

  const theme: OverlayTheme =
    raw.theme === 'minimal' ? 'minimal' : DEFAULT_THEME;

  const mode: OverlayMode = raw.mode === 'live' ? 'live' : DEFAULT_MODE;

  let volume = DEFAULT_VOLUME;
  if (typeof raw.volume === 'number' && !Number.isNaN(raw.volume)) {
    volume = raw.volume;
  } else if (typeof raw.volume === 'string') {
    const parsed = Number.parseFloat(raw.volume);
    if (!Number.isNaN(parsed)) {
      volume = parsed;
    }
  }
  volume = Math.min(1, Math.max(0, volume));

  let muted = false;
  if (typeof raw.muted === 'boolean') {
    muted = raw.muted;
  } else if (typeof raw.muted === 'string') {
    muted = raw.muted === 'true' || raw.muted === '1';
  } else if (typeof raw.muted === 'number') {
    muted = raw.muted === 1;
  }

  let variant: PrototypeVariantId | undefined;
  if (typeof raw.variant === 'string') {
    const v = raw.variant.toUpperCase();
    if (v === 'A' || v === 'B' || v === 'C') {
      variant = v as PrototypeVariantId;
    }
  }

  return {
    sessionId,
    theme,
    mode,
    volume,
    muted,
    variant,
  };
}

export function buildOverlayUrl(origin: string, search: OverlaySearch): string {
  const params = new URLSearchParams();

  if (search.sessionId) {
    params.set('sessionId', search.sessionId);
  }
  params.set('theme', search.theme);
  params.set('mode', search.mode);
  params.set('volume', search.volume.toString());
  params.set('muted', search.muted ? '1' : '0');
  if (search.variant) {
    params.set('variant', search.variant);
  }

  const queryString = params.toString();
  const path = `/overlay?${queryString}`;

  if (!origin || origin === '/') {
    return path;
  }

  const cleanOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
  return `${cleanOrigin}${path}`;
}
