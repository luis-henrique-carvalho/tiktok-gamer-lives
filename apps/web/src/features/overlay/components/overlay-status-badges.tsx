import { Badge } from '@/components/ui/badge';
import { Typography } from '@/components/ui/typography';
import { Pause, WifiOff, Sparkles } from 'lucide-react';
import type { OverlayMode } from '@/lib/overlay-url';

export interface OverlayStatusBadgesProps {
  readonly mode: OverlayMode;
  readonly isPaused: boolean;
  readonly connected: boolean;
}

export function OverlayStatusBadges({
  mode,
  isPaused,
  connected,
}: OverlayStatusBadgesProps) {
  return (
    <aside
      aria-label="Status do Overlay"
      className="absolute top-6 left-6 z-50 flex flex-wrap items-center gap-2 pointer-events-none"
    >
      {mode === 'simulation' && (
        <Badge
          variant="secondary"
          className="border border-amber-500/40 bg-amber-500/20 text-amber-300 font-semibold px-3 py-1 text-xs uppercase tracking-wider backdrop-blur-md shadow-md flex items-center gap-1.5"
        >
          <Sparkles className="size-3 text-amber-400" />
          <Typography variant="small" className="font-semibold text-amber-300">
            SIMULAÇÃO
          </Typography>
        </Badge>
      )}

      {isPaused && (
        <Badge
          variant="destructive"
          className="border border-destructive/50 bg-destructive/80 text-destructive-foreground px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-md shadow-md flex items-center gap-1.5 animate-pulse"
        >
          <Pause className="size-3" />
          <Typography
            variant="small"
            className="font-semibold text-destructive-foreground"
          >
            Pausado
          </Typography>
        </Badge>
      )}

      {!connected && (
        <Badge
          variant="outline"
          className="border border-red-500/60 bg-red-950/80 text-red-200 px-3 py-1 text-xs font-semibold backdrop-blur-md shadow-md flex items-center gap-1.5 animate-pulse"
        >
          <WifiOff className="size-3 text-red-400" />
          <Typography variant="small" className="font-semibold text-red-200">
            Reconectando…
          </Typography>
        </Badge>
      )}
    </aside>
  );
}
