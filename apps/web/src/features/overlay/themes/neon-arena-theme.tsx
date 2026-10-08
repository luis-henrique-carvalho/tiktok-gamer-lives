import { Typography } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Swords, MessageSquare, Gift, Trophy } from 'lucide-react';
import { formatScore } from '../formatters';
import { ThemeAlertsBottomBar } from './theme-alerts-bottom-bar';
import { RoundCelebrationBanner } from '../components/round-celebration-banner';
import { NeonTower } from './neon-tower';
import type { AxBRendererProps } from '../renderers/overlay-renderer-registry';

export function NeonArenaTheme({
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
      {/* 80% Content Area (Upper zone) */}
      <div className="relative w-full h-[80%] flex flex-col justify-between p-8">
        {/* Top Header: Round info, Goal, Scores */}
        <header className="flex flex-col items-center gap-3 w-full">
          <div className="flex items-center gap-3 px-6 py-2 rounded-full bg-background/80 backdrop-blur-xl border border-white/10 shadow-xl">
            <Swords className="size-4 text-primary animate-pulse" />
            <Typography
              variant="small"
              className="text-sm font-black tracking-wider uppercase"
            >
              Rodada {round}
            </Typography>
            <Badge
              variant="outline"
              className="text-xs font-mono border-white/20"
            >
              Meta: {formatScore(scoreGoal)} pts
            </Badge>
          </div>

          <div className="w-full max-w-xl grid grid-cols-2 gap-4">
            <Card className="flex flex-col p-4 rounded-2xl bg-red-950/40 border border-red-500/40 backdrop-blur-md shadow-lg shadow-red-500/10">
              <div className="flex items-center justify-between">
                <Typography
                  variant="h3"
                  className="text-lg font-black tracking-tight text-red-400 truncate"
                >
                  {teamA.name}
                </Typography>
                <div className="flex items-center gap-1 text-amber-400">
                  <Trophy className="size-3.5 fill-current" />
                  <span className="text-xs font-black">{teamA.wins}</span>
                </div>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <Typography
                  variant="h2"
                  className="text-3xl font-black text-foreground font-mono"
                >
                  {formatScore(teamA.score)}
                </Typography>
                <Badge
                  variant="outline"
                  className="text-xs font-bold border-red-500/40 text-red-300"
                >
                  {/* shadcn-ignore: decorativo */}
                  {progressA.toFixed(0)}%
                </Badge>
              </div>
            </Card>

            <Card className="flex flex-col p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 backdrop-blur-md shadow-lg shadow-cyan-500/10">
              <div className="flex items-center justify-between">
                <Typography
                  variant="h3"
                  className="text-lg font-black tracking-tight text-cyan-400 truncate"
                >
                  {teamB.name}
                </Typography>
                <div className="flex items-center gap-1 text-amber-400">
                  <Trophy className="size-3.5 fill-current" />
                  <span className="text-xs font-black">{teamB.wins}</span>
                </div>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <Typography
                  variant="h2"
                  className="text-3xl font-black text-foreground font-mono"
                >
                  {formatScore(teamB.score)}
                </Typography>
                <Badge
                  variant="outline"
                  className="text-xs font-bold border-cyan-500/40 text-cyan-300"
                >
                  {/* shadcn-ignore: decorativo */}
                  {progressB.toFixed(0)}%
                </Badge>
              </div>
            </Card>
          </div>
        </header>

        {/* Central Arena: Dual Neon Energy Towers */}
        <div className="relative flex-1 flex items-end justify-between px-16 my-6">
          <NeonTower teamName={teamA.name} progress={progressA} side="left" />

          {/* Center Arena Hub: CTA & Gift Rules */}
          <div className="flex flex-col items-center gap-4 mb-4 z-10 max-w-sm">
            {showCta && (
              <div className="flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-background/90 backdrop-blur-xl border border-primary/40 shadow-2xl">
                <MessageSquare className="size-4 text-primary animate-pulse" />
                <Typography
                  variant="small"
                  className="text-sm font-black tracking-wide"
                >
                  {/* shadcn-ignore: decorativo */}
                  Comente <span className="text-red-400">A</span> ou{' '}
                  <span className="text-cyan-400">B</span> no chat!
                </Typography>
              </div>
            )}

            {giftRules.length > 0 && (
              <Card className="flex flex-wrap items-center justify-center gap-2 p-3 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-md shadow-xl">
                <div className="flex items-center gap-1 text-muted-foreground mr-1">
                  <Gift className="size-3.5 text-primary" />
                  <Typography
                    variant="muted"
                    className="text-[11px] font-bold uppercase"
                  >
                    Presentes
                  </Typography>
                </div>
                {giftRules.map((rule) => {
                  const isA = rule.targetTeam === 'A';
                  return (
                    <Badge
                      key={rule.resourceKey}
                      variant="outline"
                      className={`text-[11px] font-semibold px-2 py-0.5 border ${
                        isA
                          ? 'border-red-500/50 text-red-300 bg-red-950/40'
                          : 'border-cyan-500/50 text-cyan-300 bg-cyan-950/40'
                      }`}
                    >
                      <span className="capitalize">{rule.resourceKey}</span>
                      <span className="ml-1 font-mono font-bold">
                        +{rule.pointsPerUnit}
                      </span>
                    </Badge>
                  );
                })}
              </Card>
            )}
          </div>

          <NeonTower teamName={teamB.name} progress={progressB} side="right" />
        </div>
      </div>

      {/* Reserved 20% Bottom Margin */}
      <div className="w-full h-[20%] pointer-events-none" />

      {/* Live Contribution Alerts Stack: Ancorado na base inferior */}
      <ThemeAlertsBottomBar alerts={alerts} />

      {celebration && (
        <RoundCelebrationBanner celebration={celebration} config={config} />
      )}
    </div>
  );
}
