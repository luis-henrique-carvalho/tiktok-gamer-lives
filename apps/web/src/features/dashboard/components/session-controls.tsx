import { useState } from 'react';
import { toast } from 'sonner';
import {
  Play,
  Pause,
  Square,
  RefreshCw,
  Clock,
  AlertTriangle,
  Radio,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Typography } from '@/components/ui/typography';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDashboardStore } from '../stores/use-dashboard-store';
import {
  startSession,
  pauseSession,
  resumeSession,
  endSession,
} from '@/api/client';
import type { GameSession, SessionStatus } from '@/api/types';

const statusDisplay: Record<
  SessionStatus,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
  }
> = {
  CONFIGURING: { label: 'CONFIGURANDO', variant: 'outline' },
  RUNNING: { label: 'EM ANDAMENTO', variant: 'default' },
  PAUSED: { label: 'PAUSADO', variant: 'secondary' },
  ENDED: { label: 'ENCERRADO', variant: 'destructive' },
};

function renderEndSessionDialog(
  open: boolean,
  sessionTitle: string,
  loading: boolean,
  onOpenChange: (open: boolean) => void,
  onConfirm: () => void,
) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            Confirmar Encerramento
          </DialogTitle>
          <DialogDescription>
            Tem certeza que deseja encerrar a partida "{sessionTitle}"? Todos os
            pontos atuais e rodadas serão congelados e finalizados.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            Confirmar Encerramento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function renderActionButtons(
  session: GameSession,
  loading: boolean,
  onStart: () => void,
  onPause: () => void,
  onResume: () => void,
  onRequestEnd: () => void,
) {
  if (session.status === 'CONFIGURING') {
    return (
      <Button
        variant="default"
        onClick={onStart}
        disabled={loading}
        className="gap-1.5 flex-1"
      >
        <Play className="size-4" />
        Iniciar Partida
      </Button>
    );
  }

  if (session.status === 'RUNNING') {
    return (
      <>
        <Button
          variant="secondary"
          onClick={onPause}
          disabled={loading}
          className="gap-1.5 flex-1"
        >
          <Pause className="size-4" />
          Pausar
        </Button>
        <Button
          variant="destructive"
          onClick={onRequestEnd}
          disabled={loading}
          className="gap-1.5"
        >
          <Square className="size-4" />
          Encerrar
        </Button>
      </>
    );
  }

  if (session.status === 'PAUSED') {
    return (
      <>
        <Button
          variant="default"
          onClick={onResume}
          disabled={loading}
          className="gap-1.5 flex-1"
        >
          <RefreshCw className="size-4" />
          Retomar
        </Button>
        <Button
          variant="destructive"
          onClick={onRequestEnd}
          disabled={loading}
          className="gap-1.5"
        >
          <Square className="size-4" />
          Encerrar
        </Button>
      </>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground w-full">
      <Clock className="size-4" />
      <span>Esta partida foi finalizada. Crie uma nova para continuar.</span>
    </div>
  );
}

export function SessionControls() {
  const session = useDashboardStore((s) => s.session);
  const setSession = useDashboardStore((s) => s.setSession);
  const addLogEvent = useDashboardStore((s) => s.addLogEvent);

  const [loading, setLoading] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);

  if (!session) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>
            <Typography variant="h4" className="flex items-center gap-2">
              <Radio className="size-4 text-muted-foreground" />
              Controle de Sessão
            </Typography>
          </CardTitle>
          <CardDescription>
            <Typography variant="muted" className="text-xs">
              Nenhuma sessão selecionada. Crie uma nova partida abaixo para
              começar.
            </Typography>
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const currentStatus = statusDisplay[session.status] || {
    label: session.status,
    variant: 'outline',
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      const updated = await startSession(session.id);
      setSession(updated);
      addLogEvent({
        type: 'system',
        text: `Partida "${session.title}" iniciada.`,
      });
      toast.success('Partida iniciada com sucesso!');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Falha ao iniciar partida';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    setLoading(true);
    try {
      const updated = await pauseSession(session.id);
      setSession(updated);
      addLogEvent({
        type: 'system',
        text: `Partida "${session.title}" pausada.`,
      });
      toast.success('Partida pausada');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Falha ao pausar partida';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    setLoading(true);
    try {
      const res = await resumeSession(session.id);
      setSession(res.session);
      addLogEvent({
        type: 'system',
        text: `Partida "${session.title}" retomada (${res.drainedCount} interações drenadas).`,
      });
      toast.success(`Partida retomada (${res.drainedCount} drenados)`);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Falha ao retomar partida';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmEnd = async () => {
    setLoading(true);
    try {
      const updated = await endSession(session.id);
      setSession(updated);
      setShowEndDialog(false);
      addLogEvent({
        type: 'system',
        text: `Partida "${session.title}" encerrada.`,
      });
      toast.success('Partida encerrada');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Falha ao encerrar partida';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>
              <Typography variant="h4">{session.title}</Typography>
            </CardTitle>
            <Badge variant={currentStatus.variant}>{currentStatus.label}</Badge>
          </div>
          <CardDescription>
            <Typography variant="muted" className="text-xs">
              ID: {session.id} • Jogo: {session.gameId.toUpperCase()}
            </Typography>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {renderActionButtons(
              session,
              loading,
              handleStart,
              handlePause,
              handleResume,
              () => setShowEndDialog(true),
            )}
          </div>
        </CardContent>
      </Card>

      {renderEndSessionDialog(
        showEndDialog,
        session.title,
        loading,
        setShowEndDialog,
        handleConfirmEnd,
      )}
    </>
  );
}
