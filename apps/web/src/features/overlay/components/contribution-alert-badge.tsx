import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Typography } from '@/components/ui/typography';
import { Gift, Zap } from 'lucide-react';
import type { OverlayAlert } from '../stores/use-overlay-store';

export interface ContributionAlertBadgeProps {
  readonly alert: OverlayAlert;
}

export function ContributionAlertBadge({ alert }: ContributionAlertBadgeProps) {
  const isTeamA = alert.team === 'A';
  const isTeamB = alert.team === 'B';

  const teamBorder = isTeamA
    ? 'border-red-500/60 bg-red-950/60 shadow-red-500/20'
    : isTeamB
      ? 'border-cyan-500/60 bg-cyan-950/60 shadow-cyan-500/20'
      : 'border-border/60 bg-background/80';

  const pointColor = isTeamA
    ? 'text-red-400'
    : isTeamB
      ? 'text-cyan-400'
      : 'text-amber-400';

  return (
    <Card
      className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl backdrop-blur-md border ${teamBorder} shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2 duration-300`}
    >
      <div className="flex items-center justify-center size-8 rounded-lg bg-primary/20 text-primary border border-primary/30 shrink-0">
        <Gift className="size-4" />
      </div>

      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1.5 truncate">
          <Typography
            variant="small"
            className="font-bold text-foreground truncate max-w-[140px]"
          >
            {alert.userName}
          </Typography>
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 border-border/60 font-mono"
          >
            x{alert.units}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          <Typography
            variant="muted"
            className="text-xs text-muted-foreground truncate capitalize"
          >
            {alert.resourceKey}
          </Typography>

          {alert.points !== null && (
            <span
              className={`text-xs font-black flex items-center gap-0.5 ${pointColor}`}
            >
              <Zap className="size-3 fill-current" />+{alert.points}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
