import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { startSimulator, stopSimulator, burstSimulator } from '@/api/client';
import type { GameSession, LogEvent } from '@/api/types';

type LogFn = (
  event: Omit<LogEvent, 'id' | 'timestamp'> & {
    readonly id?: string;
    readonly timestamp?: number;
  },
) => void;

async function executeBurst(sessionId: string, addLog: LogFn) {
  const res = await burstSimulator({
    sessionId,
    totalEvents: 200,
    eventsPerSecond: 200,
  });
  addLog({
    type: 'system',
    text: `Rajada CA-11 disparada: ${res.totalGenerated} eventos gerados.`,
  });
  toast.success(`Rajada de ${res.totalGenerated} eventos disparada!`);
}

async function toggleContinuous(
  sessionId: string,
  isRunning: boolean,
  eps: string,
  addLog: LogFn,
) {
  if (isRunning) {
    await stopSimulator();
    addLog({ type: 'system', text: 'Tráfego contínuo pausado pelo operador.' });
    toast.success('Tráfego contínuo pausado');
    return false;
  }
  const rate = Math.max(1, Number(eps) || 20);
  await startSimulator({ sessionId, eventsPerSecond: rate });
  addLog({
    type: 'system',
    text: `Tráfego contínuo iniciado com taxa de ${rate} ev/s.`,
  });
  toast.success(`Tráfego contínuo iniciado (${rate} ev/s)`);
  return true;
}

export function useSimulatorTraffic(
  session: GameSession | null,
  addLogEvent: LogFn,
) {
  const [eventsPerSec, setEventsPerSec] = useState('20');
  const [isRunningContinuous, setIsRunningContinuous] = useState(false);
  const [loadingBurst, setLoadingBurst] = useState(false);
  const [loadingTraffic, setLoadingTraffic] = useState(false);

  const isSessionRunning = session?.status === 'RUNNING';

  useEffect(() => {
    if (!isSessionRunning && isRunningContinuous) setIsRunningContinuous(false);
  }, [isSessionRunning, isRunningContinuous]);

  const handleBurst = async () => {
    if (!session?.id || session.status !== 'RUNNING') {
      toast.error('Selecione ou crie uma sessão ativa primeiro');
      return;
    }
    setLoadingBurst(true);
    try {
      await executeBurst(session.id, addLogEvent);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Falha ao disparar rajada',
      );
    } finally {
      setLoadingBurst(false);
    }
  };

  const handleToggleContinuous = async () => {
    if (!session?.id || session.status !== 'RUNNING') {
      toast.error('Selecione ou crie uma sessão ativa primeiro');
      return;
    }
    setLoadingTraffic(true);
    try {
      const nextRunning = await toggleContinuous(
        session.id,
        isRunningContinuous,
        eventsPerSec,
        addLogEvent,
      );
      setIsRunningContinuous(nextRunning);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Falha ao controlar tráfego',
      );
    } finally {
      setLoadingTraffic(false);
    }
  };

  return {
    eventsPerSec,
    setEventsPerSec,
    isRunningContinuous,
    loadingBurst,
    loadingTraffic,
    handleBurst,
    handleToggleContinuous,
  };
}
