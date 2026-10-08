import { useState } from 'react';
import { toast } from 'sonner';
import { Zap, Activity } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useDashboardStore } from '../stores/use-dashboard-store';
import {
  sendManualVote,
  sendManualGift,
  clearPendingContributions,
} from '@/api/client';
import { useSimulatorTraffic } from '../hooks/use-simulator-traffic';
import { ManualActionsSection } from './manual-actions-section';
import { BurstTrafficSection } from './burst-traffic-section';
import { ContinuousTrafficSection } from './continuous-traffic-section';

export function SimulatorPanel() {
  const session = useDashboardStore((s) => s.session);
  const snapshot = useDashboardStore((s) => s.snapshot);
  const addLogEvent = useDashboardStore((s) => s.addLogEvent);

  const {
    eventsPerSec,
    setEventsPerSec,
    isRunningContinuous,
    loadingBurst,
    loadingTraffic,
    handleBurst,
    handleToggleContinuous,
  } = useSimulatorTraffic(session, addLogEvent);

  const [loadingClearPending, setLoadingClearPending] = useState(false);
  const [manualUser, setManualUser] = useState('');
  const [giftUnits, setGiftUnits] = useState('1');
  const [loadingAction, setLoadingAction] = useState<
    'voteA' | 'voteB' | 'giftA' | 'giftB' | null
  >(null);

  const isSessionRunning = session?.status === 'RUNNING';
  const isSimulationDisabled = !isSessionRunning;
  const roundStatus = (snapshot?.projection as { roundStatus?: string })
    ?.roundStatus;
  const pendingCount =
    (snapshot?.projection as { pendingCount?: number })?.pendingCount ?? 0;
  const isInterval = roundStatus === 'INTERVAL';

  const handleManualVote = async (team: 'A' | 'B') => {
    if (!session?.id || session.status !== 'RUNNING') {
      toast.error('Selecione ou crie uma sessão ativa primeiro');
      return;
    }
    setLoadingAction(team === 'A' ? 'voteA' : 'voteB');
    const trimmedUser = manualUser.trim();
    try {
      const res = await sendManualVote({
        sessionId: session.id,
        team,
        ...(trimmedUser ? { userId: trimmedUser, userName: trimmedUser } : {}),
      });
      addLogEvent({
        type: 'comment',
        text: `Voto manual injetado no Time ${team} (+1 pt)${trimmedUser ? ` [${trimmedUser}]` : ''}`,
      });
      if (res.status === 'IGNORED') {
        const reasonMsg =
          res.reason === 'ROUND_NOT_ACTIVE'
            ? 'A rodada está em intervalo. Aguarde o início da próxima rodada.'
            : res.reason === 'COOLDOWN_ACTIVE'
              ? 'Usuário em cooldown de 5s.'
              : res.reason || 'Comando ignorado.';
        toast.warning(`Voto ignorado: ${reasonMsg}`);
      } else {
        toast.success(
          res.message || `Voto registrado para o Time ${team} (+1 pt)`,
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Falha ao registrar voto',
      );
    } finally {
      setLoadingAction(null);
    }
  };

  const handleManualGift = async (team: 'A' | 'B') => {
    if (!session?.id || session.status !== 'RUNNING') {
      toast.error('Selecione ou crie uma sessão ativa primeiro');
      return;
    }
    setLoadingAction(team === 'A' ? 'giftA' : 'giftB');
    const trimmedUser = manualUser.trim();
    const units = Math.max(1, Number(giftUnits) || 1);
    const points = units * 10;
    try {
      const res = await sendManualGift({
        sessionId: session.id,
        team,
        units,
        ...(trimmedUser ? { userId: trimmedUser, userName: trimmedUser } : {}),
      });
      addLogEvent({
        type: 'gift',
        text: `Presente manual (${units}x) injetado no Time ${team} (+${points} pts)${trimmedUser ? ` [${trimmedUser}]` : ''}`,
      });
      if (res.status === 'IGNORED') {
        toast.warning(`Presente ignorado: ${res.reason || 'Não processado'}`);
      } else if (
        res.status === 'BUFFERED' ||
        res.reason === 'SESSION_PAUSED' ||
        res.reason === 'ROUND_NOT_ACTIVE'
      ) {
        toast.info(
          `Presente em espera: computado ao iniciar a rodada (+${points} pts)`,
        );
      } else {
        toast.success(
          res.message ||
            `Presente registrado para o Time ${team} (+${points} pts)`,
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Falha ao registrar presente',
      );
    } finally {
      setLoadingAction(null);
    }
  };

  const handleClearPending = async () => {
    if (!session?.id) return;
    setLoadingClearPending(true);
    try {
      await clearPendingContributions(session.id);
      addLogEvent({
        type: 'system',
        text: 'Fila de presentes pendentes limpa com sucesso.',
      });
      toast.success('Fila de presentes pendentes limpa!');
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Falha ao limpar fila de pendências',
      );
    } finally {
      setLoadingClearPending(false);
    }
  };

  const isAnyLoading =
    isSimulationDisabled ||
    loadingBurst ||
    loadingTraffic ||
    loadingClearPending ||
    loadingAction !== null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>
            <Typography variant="h4" className="flex items-center gap-2">
              <Zap className="size-4 text-amber-500" />
              Simulador de Tráfego & Carga
            </Typography>
          </CardTitle>
          <Badge
            variant={isRunningContinuous ? 'default' : 'outline'}
            className="gap-1"
          >
            <Activity className="size-3" />
            {isRunningContinuous ? 'TRÁFEGO ATIVO' : 'IDLE'}
          </Badge>
        </div>
        <CardDescription>
          <Typography variant="muted" className="text-xs">
            Injeção de eventos sintéticos, disparador de estresse CA-11 e ações
            manuais de teste.
          </Typography>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <BurstTrafficSection
          disabled={isSimulationDisabled}
          loading={loadingBurst}
          onBurst={handleBurst}
        />
        <ContinuousTrafficSection
          disabled={isSimulationDisabled}
          isRunning={isRunningContinuous}
          loading={loadingTraffic}
          eventsPerSec={eventsPerSec}
          onEventsPerSecChange={setEventsPerSec}
          onToggle={handleToggleContinuous}
        />
        <Separator className="my-1" />
        <ManualActionsSection
          isAnyLoading={isAnyLoading}
          loadingAction={loadingAction}
          manualUser={manualUser}
          setManualUser={setManualUser}
          giftUnits={giftUnits}
          setGiftUnits={setGiftUnits}
          onVote={handleManualVote}
          onGift={handleManualGift}
          isInterval={isInterval}
          pendingCount={pendingCount}
          onClearPending={handleClearPending}
          loadingClearPending={loadingClearPending}
        />
      </CardContent>
    </Card>
  );
}
