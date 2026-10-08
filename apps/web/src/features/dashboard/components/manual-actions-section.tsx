import {
  Loader2,
  Vote,
  Gift,
  Sparkles,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Typography } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';

export interface ManualActionsProps {
  readonly isAnyLoading: boolean;
  readonly loadingAction: 'voteA' | 'voteB' | 'giftA' | 'giftB' | null;
  readonly manualUser: string;
  readonly setManualUser: (user: string) => void;
  readonly giftUnits: string;
  readonly setGiftUnits: (units: string) => void;
  readonly onVote: (team: 'A' | 'B') => void;
  readonly onGift: (team: 'A' | 'B') => void;
  readonly isInterval?: boolean;
  readonly pendingCount?: number;
  readonly onClearPending?: () => void;
  readonly loadingClearPending?: boolean;
}

export function ManualActionsSection({
  isAnyLoading,
  loadingAction,
  manualUser,
  setManualUser,
  giftUnits,
  setGiftUnits,
  onVote,
  onGift,
  isInterval = false,
  pendingCount = 0,
  onClearPending,
  loadingClearPending = false,
}: ManualActionsProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Typography
          variant="small"
          className="font-semibold text-foreground flex items-center gap-1.5"
        >
          <Sparkles className="size-4 text-primary" />
          Ações Manuais (1-Clique)
        </Typography>
        <Badge variant="outline" className="text-[10px]">
          Votos & Presentes
        </Badge>
      </div>

      {isInterval && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle className="size-3.5 shrink-0" />
          <span>
            Intervalo entre rodadas ativo: votos são ignorados até o início da
            próxima rodada.
          </span>
        </div>
      )}

      {pendingCount > 0 && (
        <div className="flex items-center justify-between p-2 rounded-md bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400">
          <span>{pendingCount} presentes pendentes na fila</span>
          {onClearPending && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearPending}
              disabled={isAnyLoading || loadingClearPending}
              className="h-6 px-2 text-xs text-destructive hover:bg-destructive/10"
            >
              {loadingClearPending ? (
                <Loader2 className="size-3 animate-spin mr-1" />
              ) : (
                <Trash2 className="size-3 mr-1" />
              )}
              Limpar fila
            </Button>
          )}
        </div>
      )}

      <Typography variant="muted" className="text-xs">
        Injeção de votos unitários (+1) e presentes (+10 pts) para teste de
        pontuação e cooldown.
      </Typography>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onVote('A')}
          disabled={isAnyLoading}
          className="gap-1.5 border-blue-500/30 hover:bg-blue-500/10 text-blue-600 dark:text-blue-400"
        >
          {loadingAction === 'voteA' ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Vote className="size-3.5" />
          )}
          Votar A (+1 pt)
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onVote('B')}
          disabled={isAnyLoading}
          className="gap-1.5 border-rose-500/30 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400"
        >
          {loadingAction === 'voteB' ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Vote className="size-3.5" />
          )}
          Votar B (+1 pt)
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onGift('A')}
          disabled={isAnyLoading}
          className="gap-1.5 border-blue-500/30 hover:bg-blue-500/10 text-blue-600 dark:text-blue-400"
        >
          {loadingAction === 'giftA' ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Gift className="size-3.5" />
          )}
          Presente A (+10 pts)
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onGift('B')}
          disabled={isAnyLoading}
          className="gap-1.5 border-rose-500/30 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400"
        >
          {loadingAction === 'giftB' ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Gift className="size-3.5" />
          )}
          Presente B (+10 pts)
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="manual-user">Usuário Simulado (opcional)</Label>
          <Input
            id="manual-user"
            placeholder="ex: user_teste (cooldown 5s)"
            value={manualUser}
            onChange={(e) => setManualUser(e.target.value)}
            disabled={isAnyLoading}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gift-units">Unidades do Presente</Label>
          <Input
            id="gift-units"
            type="number"
            min={1}
            value={giftUnits}
            onChange={(e) => setGiftUnits(e.target.value)}
            disabled={isAnyLoading}
          />
        </div>
      </div>
    </div>
  );
}
