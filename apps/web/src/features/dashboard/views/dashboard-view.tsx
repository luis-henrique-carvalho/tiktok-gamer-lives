import { useEffect } from 'react';
import { Radio, ExternalLink, LogOut, Wifi, WifiOff } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Typography } from '@/components/ui/typography';
import { authClient } from '@/lib/auth-client';
import { realtimeClient } from '@/lib/socket-client';
import { useDashboardStore } from '../stores/use-dashboard-store';
import { SessionControls } from '../components/session-controls';
import { AxBConfigForm } from '../components/axb-config-form';
import { TikTokConnectorCard } from '../components/tiktok-connector-card';
import { SimulatorPanel } from '../components/simulator-panel';
import { MetricsCard } from '../components/metrics-card';
import { EventsHistoryLog } from '../components/events-history-log';
import { MatchScoreboardCard } from '../components/match-scoreboard-card';
import { getSession } from '@/api/client';
import type { GameSession, GameSnapshot, AxBProjection } from '@/api/types';

interface DashboardViewProps {
  readonly onSignOut?: () => void;
}

function computeDisplayProjection(
  snapshot: GameSnapshot | null,
  session: GameSession | null,
): AxBProjection | null {
  if (snapshot?.projection) {
    return snapshot.projection as AxBProjection;
  }
  if (!session) {
    return null;
  }

  const sessionConfig = session.config as Record<string, unknown> | undefined;
  const isRunning = session.status === 'RUNNING';
  const isPaused = session.status === 'PAUSED';

  return {
    round: 1,
    roundStatus: isRunning ? 'ACTIVE' : isPaused ? 'INTERVAL' : 'ACTIVE',
    scoreGoal: (sessionConfig?.scoreGoal as number) ?? 1000,
    teamA: {
      id: 'A',
      name: (sessionConfig?.teamA as { name?: string })?.name ?? 'Time A',
      color: (sessionConfig?.teamA as { color?: string })?.color ?? '#EF4444',
      score: 0,
      wins: 0,
      progressPercentage: 0,
      relativePercentage: 50,
    },
    teamB: {
      id: 'B',
      name: (sessionConfig?.teamB as { name?: string })?.name ?? 'Time B',
      color: (sessionConfig?.teamB as { color?: string })?.color ?? '#3B82F6',
      score: 0,
      wins: 0,
      progressPercentage: 0,
      relativePercentage: 50,
    },
    history: [],
    isPaused,
    pendingCount: 0,
    lastWinner: null,
  };
}

export function DashboardView({ onSignOut }: DashboardViewProps) {
  const session = useDashboardStore((s) => s.session);
  const setSession = useDashboardStore((s) => s.setSession);
  const snapshot = useDashboardStore((s) => s.snapshot);
  const isConnected = useDashboardStore((s) => s.isConnected);
  const updateSnapshot = useDashboardStore((s) => s.updateSnapshot);
  const addAlert = useDashboardStore((s) => s.addAlert);
  const setConnected = useDashboardStore((s) => s.setConnected);
  const setTikTokStatus = useDashboardStore((s) => s.setTikTokStatus);
  const addLogEvent = useDashboardStore((s) => s.addLogEvent);
  const updateMetrics = useDashboardStore((s) => s.updateMetrics);

  useEffect(() => {
    realtimeClient.connect();

    const unsubSnapshot = realtimeClient.onSnapshot((s) => {
      updateSnapshot(s);
    });

    const unsubAlert = realtimeClient.onAlert((a) => {
      addAlert(a);
    });

    const unsubStatus = realtimeClient.onStatusChange((status) => {
      setConnected(status);
    });

    const unsubTikTok = realtimeClient.onTikTokEvent((event) => {
      if (event.type === 'tiktok:connected') {
        const payload = event.payload as {
          username?: string;
          sessionId?: string;
        };
        setTikTokStatus({
          status: 'connected',
          username: payload?.username ?? null,
          sessionId: payload?.sessionId ?? null,
        });
        addLogEvent({
          type: 'system',
          text: `TikTok Live conectada (@${payload?.username})`,
        });
      } else if (
        event.type === 'tiktok:disconnected' ||
        event.type === 'tiktok:stream_ended'
      ) {
        setTikTokStatus({
          status: 'disconnected',
          username: null,
          sessionId: null,
        });
        addLogEvent({
          type: 'system',
          text: `TikTok Live finalizada ou desconectada (${event.type})`,
        });
      }
    });

    return () => {
      unsubSnapshot();
      unsubAlert();
      unsubStatus();
      unsubTikTok();
    };
  }, [updateSnapshot, addAlert, setConnected, setTikTokStatus, addLogEvent]);

  useEffect(() => {
    if (session?.id) {
      realtimeClient.joinSession(session.id);
    } else if (typeof window !== 'undefined' && window.localStorage) {
      const savedId = window.localStorage.getItem('active_session_id');
      if (savedId) {
        getSession(savedId)
          .then((restored) => {
            if (restored && restored.status !== 'ENDED') {
              setSession(restored);
            } else {
              window.localStorage.removeItem('active_session_id');
            }
          })
          .catch(() => {
            window.localStorage.removeItem('active_session_id');
          });
      }
    }
  }, [session?.id, setSession]);

  useEffect(() => {
    let lastEvents = useDashboardStore.getState().metrics.eventsCount;
    let lastSequence = useDashboardStore.getState().metrics.sequence;

    const interval = setInterval(() => {
      const currentEvents = useDashboardStore.getState().metrics.eventsCount;
      const currentSequence = useDashboardStore.getState().metrics.sequence;

      const eventsPerSec = Math.max(0, currentEvents - lastEvents);
      const snapshotsPerSec = Math.max(0, currentSequence - lastSequence);

      lastEvents = currentEvents;
      lastSequence = currentSequence;

      updateMetrics({
        eventsPerSecond: eventsPerSec,
        snapshotsPerSecond: snapshotsPerSec,
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [updateMetrics]);

  const handleSignOut = async () => {
    await authClient.signOut();
    onSignOut?.();
  };

  const displayProjection = computeDisplayProjection(snapshot, session);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto flex h-14 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Radio className="size-5 text-primary animate-pulse" />
            <Typography variant="h4" className="font-bold tracking-tight">
              Dashboard do Operador
            </Typography>
            <Badge
              variant={isConnected ? 'default' : 'outline'}
              className="gap-1 text-[10px]"
            >
              {isConnected ? (
                <>
                  <Wifi className="size-3 text-emerald-400" />
                  ONLINE
                </>
              ) : (
                <>
                  <WifiOff className="size-3 text-muted-foreground" />
                  OFFLINE
                </>
              )}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/overlay"
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({
                variant: 'outline',
                size: 'sm',
                className: 'gap-1.5',
              })}
            >
              <ExternalLink className="size-3.5" />
              Abrir Overlay
            </a>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="gap-1 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="size-3.5" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {/* Live Scoreboard Summary */}
        <MatchScoreboardCard
          projection={displayProjection}
          sessionStatus={session?.status}
        />

        {/* 2-Column Responsive Operator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column: Match & Ingress Controls */}
          <div className="flex flex-col gap-6">
            <SessionControls />
            <AxBConfigForm />
            <TikTokConnectorCard />
          </div>

          {/* Right Column: Ingress Simulation, Telemetry & Logs */}
          <div className="flex flex-col gap-6">
            <SimulatorPanel />
            <MetricsCard />
            <EventsHistoryLog />
          </div>
        </div>
      </main>
    </div>
  );
}
