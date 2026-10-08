import { Typography } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Swords, MessageSquare, Gift, Trophy } from 'lucide-react';
import { formatScore } from '../formatters';
import { ContributionAlertBadge } from '../components/contribution-alert-badge';
import { RoundCelebrationBanner } from '../components/round-celebration-banner';
import type { AxBRendererProps } from '../renderers/overlay-renderer-registry';

export function MinimalTheme({
  projection,
  config,
  alerts,
  celebration,
}: AxBRendererProps) {
  const teamA = projection?.teamA ?? {
    id: 'A',
    name: config?.teamA.name ?? 'Time A',
    color: config?.teamA.color ?? '#ef4444',
    score: 0,
    wins: 0,
    progressPercentage: 0,
    relativePercentage: 50,
  };

  const teamB = projection?.teamB ?? {
    id: 'B',
    name: config?.teamB.name ?? 'Time B',
    color: config?.teamB.color ?? '#06b6d4',
    score: 0,
    wins: 0,
    progressPercentage: 0,
    relativePercentage: 50,
  };

  const scoreGoal = projection?.scoreGoal ?? config?.scoreGoal ?? 1000;
  const round = projection?.round ?? 1;
  const isPaused = projection?.isPaused ?? false;
  const isInterval = projection?.roundStatus === 'INTERVAL';
  const showCta = !isPaused && !isInterval;

  const progressA = Math.min(100, Math.max(0, teamA.progressPercentage));
  const progressB = Math.min(100, Math.max(0, teamB.progressPercentage));
  const giftRules = config?.giftRules ?? [];

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden select-none pointer-events-none text-foreground font-sans">
      {/* 80% Content Area */}
      <div className="relative w-full h-[80%] flex flex-col justify-between p-8">
        {/* Esports Clean Scoreboard Header */}
        <header className="flex flex-col items-center gap-4 w-full">
          <Card className="w-full max-w-xl p-4 rounded-xl bg-background/95 border-2 border-border shadow-2xl backdrop-blur-md">
            {/* Top Bar: Round & Meta */}
            <div className="flex items-center justify-between border-b border-border/80 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <Swords className="size-4 text-primary" />
                <Typography
                  variant="small"
                  className="font-black uppercase tracking-wider text-xs"
                >
                  Rodada {round}
                </Typography>
              </div>
              <Badge variant="secondary" className="font-mono text-xs">
                Meta: {formatScore(scoreGoal)} pts
              </Badge>
            </div>

            {/* Duel Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Team A Side */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Typography
                    variant="small"
                    className="font-black text-red-500 uppercase tracking-wide truncate"
                  >
                    {teamA.name}
                  </Typography>
                  <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
                    <Trophy className="size-3 text-amber-500" />
                    <span>{teamA.wins}</span>
                  </div>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black font-mono text-foreground">
                    {formatScore(teamA.score)}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground font-mono">
                    {progressA.toFixed(0)}%
                  </span>
                </div>

                <Progress
                  value={progressA}
                  className="h-3 rounded-sm bg-muted **:data-[slot=progress-indicator]:bg-red-500"
                />
              </div>

              {/* Team B Side */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Typography
                    variant="small"
                    className="font-black text-cyan-500 uppercase tracking-wide truncate"
                  >
                    {teamB.name}
                  </Typography>
                  <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
                    <Trophy className="size-3 text-amber-500" />
                    <span>{teamB.wins}</span>
                  </div>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black font-mono text-foreground">
                    {formatScore(teamB.score)}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground font-mono">
                    {progressB.toFixed(0)}%
                  </span>
                </div>

                <Progress
                  value={progressB}
                  className="h-3 rounded-sm bg-muted **:data-[slot=progress-indicator]:bg-cyan-500"
                />
              </div>
            </div>
          </Card>

          {/* Clean CTA */}
          {showCta && (
            <Card className="flex items-center gap-2 px-5 py-2 rounded-lg bg-background/90 border border-border shadow-md">
              <MessageSquare className="size-4 text-primary" />
              <Typography
                variant="small"
                className="font-bold text-xs uppercase tracking-wide"
              >
                {/* shadcn-ignore: decorativo */}
                Vote no chat: <span className="text-red-500 font-black">
                  A
                </span>{' '}
                ou <span className="text-cyan-500 font-black">B</span>
              </Typography>
            </Card>
          )}

          {/* Minimal Gift Table */}
          {giftRules.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-md">
              <div className="flex items-center gap-1 text-muted-foreground text-xs font-semibold">
                <Gift className="size-3.5" />
                <span>Presentes:</span>
              </div>
              {giftRules.map((rule) => (
                <Badge
                  key={rule.resourceKey}
                  variant="outline"
                  className={`text-[10px] font-mono font-bold ${
                    rule.targetTeam === 'A'
                      ? 'border-red-500/40 text-red-400'
                      : 'border-cyan-500/40 text-cyan-400'
                  }`}
                >
                  {rule.resourceKey} (+{rule.pointsPerUnit})
                </Badge>
              ))}
            </div>
          )}
        </header>

        {/* Live Contribution Alerts Stack */}
        <div className="flex flex-col gap-2 w-full max-w-sm pointer-events-none mt-auto">
          {alerts.map((alert) => (
            <ContributionAlertBadge key={alert.id} alert={alert} />
          ))}
        </div>
      </div>

      {/* Reserved 20% Bottom Margin */}
      <div className="w-full h-[20%] pointer-events-none" />

      {/* Celebration Banner */}
      {celebration && (
        <RoundCelebrationBanner celebration={celebration} config={config} />
      )}
    </div>
  );
}
