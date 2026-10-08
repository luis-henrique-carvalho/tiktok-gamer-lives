import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Typography } from '@/components/ui/typography';
import { Trophy, Clock } from 'lucide-react';
import type { OverlayCelebration } from '../stores/use-overlay-store';
import type { AxBConfig } from '@/api/types';

export interface RoundCelebrationBannerProps {
  readonly celebration: OverlayCelebration;
  readonly config: AxBConfig | null;
}

export function RoundCelebrationBanner({
  celebration,
  config,
}: RoundCelebrationBannerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(() =>
    Math.max(0, Math.ceil((celebration.endsAt - Date.now()) / 1000)),
  );

  useEffect(() => {
    const updateCountdown = () => {
      const remainingMs = celebration.endsAt - Date.now();
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
      setSecondsRemaining(remainingSec);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 250);

    return () => {
      clearInterval(interval);
    };
  }, [celebration.endsAt]);

  const winnerTeamConfig =
    celebration.winner === 'A' ? config?.teamA : config?.teamB;
  const winnerName = winnerTeamConfig?.name ?? `Time ${celebration.winner}`;

  const isTeamA = celebration.winner === 'A';
  const colorClasses = isTeamA
    ? 'border-red-500/80 bg-red-950/90 shadow-red-500/40 text-red-100'
    : 'border-cyan-500/80 bg-cyan-950/90 shadow-cyan-500/40 text-cyan-100';

  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-full max-w-lg px-6 animate-in zoom-in-95 duration-400"
    >
      <Card
        className={`p-6 rounded-3xl border-2 ${colorClasses} backdrop-blur-xl shadow-2xl flex flex-col items-center text-center gap-3`}
      >
        <div className="size-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shadow-lg animate-bounce">
          <Trophy className="size-8" />
        </div>

        <div className="flex flex-col gap-1">
          <Typography
            variant="muted"
            className="text-xs uppercase tracking-widest font-bold text-amber-300"
          >
            Fim de Rodada!
          </Typography>
          <Typography
            variant="h2"
            className="text-3xl font-black tracking-tight"
          >
            Vitória do {winnerName}!
          </Typography>
        </div>

        <Badge
          variant="outline"
          className="border-white/20 bg-black/40 text-foreground px-4 py-1.5 rounded-full flex items-center gap-2 mt-2"
        >
          <Clock className="size-3.5 text-muted-foreground animate-spin" />
          <Typography variant="small" className="font-semibold text-xs">
            Próxima rodada em {secondsRemaining}s
          </Typography>
        </Badge>
      </Card>
    </div>
  );
}
