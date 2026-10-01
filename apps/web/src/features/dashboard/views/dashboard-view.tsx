import { useEffect } from 'react';
import {
  Radio,
  ExternalLink,
  LogOut,
  Swords,
  Trophy,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Typography } from '@/components/ui/typography';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { authClient } from '@/lib/auth-client';
import { realtimeClient } from '@/lib/socket-client';
import { useDashboardStore } from '../stores/use-dashboard-store';
import { SessionControls } from '../components/session-controls';
import { AxBConfigForm } from '../components/axb-config-form';
import { TikTokConnectorCard } from '../components/tiktok-connector-card';
import { SimulatorPanel } from '../components/simulator-panel';
import { MetricsCard } from '../components/metrics-card';
import { EventsHistoryLog } from '../components/events-history-log';
import type { AxBProjection } from '@/api/types';

interface DashboardViewProps {
  readonly onSignOut?: () => void;
}

export function DashboardView({ onSignOut }: DashboardViewProps) {
  const session = useDashboardStore((s) => s.session);
  const snapshot = useDashboardStore((s) => s.snapshot);
  const isConnected = useDashboardStore((s) => s.isConnected);
  const updateSnapshot = useDashboardStore((s) => s.updateSnapshot);
  const addAlert = useDashboardStore((s) => s.addAlert);
  const setConnected = useDashboardStore((s) => s.setConnected);
  const setTikTokStatus = useDashboardStore((s) => s.setTikTokStatus);
  const addLogEvent = useDashboardStore((s) => s.addLogEvent);

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
    }
  }, [session?.id]);

  const handleSignOut = async () => {
    await authClient.signOut();
    onSignOut?.();
  };

  const projection = snapshot?.projection as AxBProjection | undefined;

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
        {/* Live Scoreboard Summary (if active) */}
        {projection && (
          <Card className="border-primary/20 bg-muted/20">
            <CardContent className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Swords className="size-4 text-primary" />
                  <Typography variant="small" className="font-semibold">
                    Rodada #{projection.round} — Placar em Tempo Real
                  </Typography>
                </div>
                <Badge variant="outline" className="gap-1">
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
                    <span className="font-mono">
                      {projection.teamA.score} pts
                    </span>
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
                    <span className="font-mono">
                      {projection.teamB.score} pts
                    </span>
                  </div>
                  <Progress
                    value={projection.teamB.progressPercentage}
                    className="h-2.5 bg-muted"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
