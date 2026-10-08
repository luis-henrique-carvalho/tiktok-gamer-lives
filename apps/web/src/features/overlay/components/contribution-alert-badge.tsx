import { Badge } from '@/components/ui/badge';
import { Gift, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OverlayAlert } from '../stores/use-overlay-store';

export interface ContributionAlertBadgeProps {
  readonly alert: OverlayAlert;
}

function formatResourceName(key: string): string {
  if (key.startsWith('tiktok:gift:')) {
    return `ID ${key.replace('tiktok:gift:', '')}`;
  }
  return key;
}

export function ContributionAlertBadge({ alert }: ContributionAlertBadgeProps) {
  const isTeamA = alert.team === 'A';
  const isTeamB = alert.team === 'B';

  const teamBorder = isTeamA
    ? 'border-red-500/80 border-l-4 border-l-red-500 shadow-[0_0_15px_rgba(239,68,68,0.35)]'
    : isTeamB
      ? 'border-cyan-400/80 border-l-4 border-l-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.35)]'
      : 'border-amber-400/80 border-l-4 border-l-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.35)]';

  const pointColor = isTeamA
    ? 'text-red-400'
    : isTeamB
      ? 'text-cyan-400'
      : 'text-amber-400';

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-black/95 backdrop-blur-md border select-none transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 shrink-0 min-w-[170px] max-w-[220px]',
        teamBorder,
      )}
    >
      <div className="flex items-center justify-center size-7 rounded-lg bg-white/10 text-white shrink-0 border border-white/15">
        <Gift className="size-4 text-amber-300" />
      </div>

      <div className="flex flex-col min-w-0 flex-1 leading-tight">
        <div className="flex items-center justify-between gap-1.5">
          <span className="font-black text-white text-xs truncate max-w-[105px]">
            {alert.userName}
          </span>
          <Badge
            variant="outline"
            className="text-[9px] px-1.5 py-0 border-white/30 text-amber-300 font-mono font-black h-4 shrink-0 bg-white/5"
          >
            x{alert.units}
          </Badge>
        </div>

        <div className="flex items-center justify-between gap-1 mt-0.5">
          <span className="text-[10px] font-bold text-white/70 truncate capitalize">
            {formatResourceName(alert.resourceKey)}
          </span>

          {alert.points !== null && (
            <span
              className={cn(
                'text-[11px] font-black font-mono flex items-center gap-0.5 shrink-0',
                pointColor,
              )}
            >
              <Zap className="size-2.5 fill-current" />+{alert.points}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
