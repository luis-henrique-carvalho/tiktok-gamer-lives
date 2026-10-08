import { Swords, Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { AxBProjection } from '@/api/types';

interface MatchScoreboardCardProps {
  readonly projection: AxBProjection | null;
  readonly sessionStatus?: string;
}

export function MatchScoreboardCard({
  projection,
  sessionStatus,
}: MatchScoreboardCardProps) {
  if (!projection) {
    return (
      <Card className="border-dashed border-border bg-muted/10">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Trophy className="size-5" />
            </div>
            <div>
              <Typography variant="small" className="font-semibold">
                Placar em Espera
              </Typography>
              <Typography variant="muted" className="text-xs">
                Nenhuma partida ativa. Crie ou inicie uma sessão no painel
                abaixo para acompanhar o placar ao vivo.
              </Typography>
            </div>
          </div>
          <Badge variant="outline" className="text-muted-foreground text-xs">
            Sem Partida
          </Badge>
        </CardContent>
      </Card>
    );
  }

  const isRunning = sessionStatus === 'RUNNING';
  const isPaused = sessionStatus === 'PAUSED';
  const isEnded = sessionStatus === 'ENDED';
  const isInterval = projection.roundStatus === 'INTERVAL';

  const lastWinnerName = projection.lastWinner
    ? projection.lastWinner === 'A'
      ? projection.teamA.name
      : projection.teamB.name
    : null;

  const pausedLabel =
    projection.pendingCount > 0
      ? `PAUSADO • ${projection.pendingCount} presente${projection.pendingCount > 1 ? 's' : ''} em espera`
      : 'PAUSADO';

  const intervalLabel = lastWinnerName
    ? `INTERVALO • Vitória: ${lastWinnerName}`
    : 'INTERVALO';

  return (
    <Card className="border-primary/20 bg-muted/20 shadow-sm">
      <CardContent className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords className="size-4 text-primary" />
            <Typography variant="small" className="font-semibold">
              Rodada #{projection.round} — Placar em Tempo Real
            </Typography>
            <Badge
              variant={
                isEnded
                  ? 'destructive'
                  : isInterval
                    ? 'secondary'
                    : isRunning
                      ? 'default'
                      : isPaused
                        ? 'outline'
                        : 'secondary'
              }
              className={`text-[10px] ${
                isInterval
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 font-medium'
                  : ''
              }`}
            >
              {isEnded
                ? 'ENCERRADO'
                : isInterval
                  ? intervalLabel
                  : isRunning
                    ? 'EM ANDAMENTO'
                    : isPaused
                      ? pausedLabel
                      : 'AGUARDANDO INÍCIO'}
            </Badge>
          </div>
          <Badge variant="outline" className="gap-1 font-mono">
            <Trophy className="size-3 text-amber-500" />
            Meta: {projection.scoreGoal} pts
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span style={{ color: projection.teamA.color }}>
                {projection.teamA.name} ({projection.teamA.wins}V)
              </span>
              <span className="font-mono">{projection.teamA.score} pts</span>
            </div>
            <Progress
              value={projection.teamA.progressPercentage}
              className="h-2.5 bg-muted"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span style={{ color: projection.teamB.color }}>
                {projection.teamB.name} ({projection.teamB.wins}V)
              </span>
              <span className="font-mono">{projection.teamB.score} pts</span>
            </div>
            <Progress
              value={projection.teamB.progressPercentage}
              className="h-2.5 bg-muted"
            />
          </div>
        </div>

        {projection.history && projection.history.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground/80">
              Rodadas anteriores:
            </span>
            {projection.history.map((h) => {
              const winnerTeam =
                h.winner === 'A' ? projection.teamA : projection.teamB;
              return (
                <Badge
                  key={h.roundNumber}
                  variant="outline"
                  className="text-[10px] py-0 px-1.5 font-normal gap-1"
                >
                  <span className="font-semibold">R{h.roundNumber}:</span>
                  <span
                    style={{ color: winnerTeam.color }}
                    className="font-medium"
                  >
                    {winnerTeam.name}
                  </span>
                  <span className="font-mono text-muted-foreground">
                    ({h.finalScore.teamA}x{h.finalScore.teamB})
                  </span>
                </Badge>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
