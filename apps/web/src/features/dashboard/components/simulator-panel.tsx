import { useState } from 'react';
import { toast } from 'sonner';
import { Zap, Play, Square, Flame, Loader2, Activity } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Typography } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';
import { useDashboardStore } from '../stores/use-dashboard-store';
import { startSimulator, stopSimulator, burstSimulator } from '@/api/client';

export function SimulatorPanel() {
  const session = useDashboardStore((s) => s.session);
  const addLogEvent = useDashboardStore((s) => s.addLogEvent);

  const [eventsPerSec, setEventsPerSec] = useState('20');
  const [isRunningContinuous, setIsRunningContinuous] = useState(false);
  const [loadingBurst, setLoadingBurst] = useState(false);
  const [loadingTraffic, setLoadingTraffic] = useState(false);

  const handleBurst = async () => {
    if (!session?.id) {
      toast.error('Selecione ou crie uma sessão ativa primeiro');
      return;
    }

    setLoadingBurst(true);
    try {
      const res = await burstSimulator({
        sessionId: session.id,
        totalEvents: 200,
        eventsPerSecond: 200,
      });
      addLogEvent({
        type: 'system',
        text: `Rajada CA-11 disparada: ${res.totalGenerated} eventos gerados.`,
      });
      toast.success(`Rajada de ${res.totalGenerated} eventos disparada!`);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Falha ao disparar rajada';
      toast.error(msg);
    } finally {
      setLoadingBurst(false);
    }
  };

  const handleToggleContinuous = async () => {
    if (!session?.id) {
      toast.error('Selecione ou crie uma sessão ativa primeiro');
      return;
    }

    setLoadingTraffic(true);
    try {
      if (isRunningContinuous) {
        await stopSimulator();
        setIsRunningContinuous(false);
        addLogEvent({
          type: 'system',
          text: 'Tráfego contínuo pausado pelo operador.',
        });
        toast.success('Tráfego contínuo pausado');
      } else {
        const rate = Math.max(1, Number(eventsPerSec) || 20);
        await startSimulator({
          sessionId: session.id,
          eventsPerSecond: rate,
        });
        setIsRunningContinuous(true);
        addLogEvent({
          type: 'system',
          text: `Tráfego contínuo iniciado com taxa de ${rate} ev/s.`,
        });
        toast.success(`Tráfego contínuo iniciado (${rate} ev/s)`);
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Falha ao controlar tráfego';
      toast.error(msg);
    } finally {
      setLoadingTraffic(false);
    }
  };

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
            Injeção de eventos sintéticos e disparador de estresse CA-11 (200
            ev/s).
          </Typography>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center justify-between">
            <Typography
              variant="small"
              className="font-semibold text-amber-600 dark:text-amber-400"
            >
              Estresse CA-11 (200 ev/s)
            </Typography>
            <Badge variant="outline" className="text-[10px]">
              200 eventos
            </Badge>
          </div>
          <Typography variant="muted" className="text-xs">
            Dispara 200 eventos/s instantâneos para validação de throughput e
            batching rAF.
          </Typography>
          <Button
            variant="default"
            onClick={handleBurst}
            disabled={loadingBurst}
            className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
          >
            {loadingBurst ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Disparando...
              </>
            ) : (
              <>
                <Flame className="size-4" />
                Disparar Rajada CA-11 (200 ev/s)
              </>
            )}
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="events-rate">Taxa de Eventos (ev/s)</Label>
            <Input
              id="events-rate"
              type="number"
              min={1}
              max={100}
              value={eventsPerSec}
              onChange={(e) => setEventsPerSec(e.target.value)}
              disabled={isRunningContinuous || loadingTraffic}
            />
          </div>

          <Button
            variant={isRunningContinuous ? 'destructive' : 'outline'}
            onClick={handleToggleContinuous}
            disabled={loadingTraffic}
            className="gap-2"
          >
            {loadingTraffic ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isRunningContinuous ? (
              <>
                <Square className="size-4" />
                Parar Tráfego Contínuo
              </>
            ) : (
              <>
                <Play className="size-4" />
                Iniciar Tráfego Contínuo
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
