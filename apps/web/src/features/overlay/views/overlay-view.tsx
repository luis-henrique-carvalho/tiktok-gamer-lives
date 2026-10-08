import { useEffect } from 'react';
import type { OverlaySearch } from '@/lib/overlay-url';
import { useOverlaySession } from '../hooks/use-overlay-session';
import { getOverlayRenderer } from '../renderers/overlay-renderer-registry';
import { OverlayStatusBadges } from '../components/overlay-status-badges';
import { AudioEffectPlayer } from '../components/audio-effect-player';
import { Card } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { AlertTriangle } from 'lucide-react';

export interface OverlayViewProps {
  readonly search: OverlaySearch;
  readonly activeVariant?: string;
}

export function OverlayView({ search, activeVariant }: OverlayViewProps) {
  // Apply transparent background to html/body for OBS Browser Source
  useEffect(() => {
    document.documentElement.classList.add('overlay-transparent');
    return () => {
      document.documentElement.classList.remove('overlay-transparent');
    };
  }, []);

  const {
    projection,
    config,
    gameId,
    connected,
    alerts,
    celebration,
    isAudioSuspended,
    resumeAudio,
  } = useOverlaySession({
    sessionId: search.sessionId,
    volume: search.volume,
    muted: search.muted,
  });

  if (!search.sessionId && !activeVariant && !search.variant) {
    return (
      <main className="w-full min-h-screen flex items-center justify-center p-6 bg-transparent">
        <Card className="max-w-md p-6 rounded-2xl bg-background/90 border border-border shadow-xl backdrop-blur-md flex flex-col items-center text-center gap-3">
          <div className="size-12 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
            <AlertTriangle className="size-6" />
          </div>
          <Typography variant="h3" className="font-bold">
            Sessão não especificada
          </Typography>
          <Typography variant="muted" className="text-sm">
            Abra este overlay pelo link gerado no Dashboard de Controle ou
            forneça o parâmetro{' '}
            <code className="text-foreground font-mono bg-muted px-1 rounded">
              ?sessionId=...
            </code>
            .
          </Typography>
        </Card>
      </main>
    );
  }

  // Mock demo projection for prototype evaluation when viewing design prototypes without live session
  const effectiveProjection = projection ?? {
    round: 1,
    roundStatus: 'ACTIVE' as const,
    scoreGoal: 1000,
    teamA: {
      id: 'A' as const,
      name: 'Ronaldo',
      color: '#ef4444',
      score: 424,
      wins: 2,
      progressPercentage: 42,
      relativePercentage: 60,
    },
    teamB: {
      id: 'B' as const,
      name: 'Messi',
      color: '#3b82f6',
      score: 270,
      wins: 1,
      progressPercentage: 27,
      relativePercentage: 40,
    },
    history: [],
    isPaused: false,
    pendingCount: 0,
    lastWinner: null,
  };

  const effectiveConfig =
    config ??
    (search.sessionId
      ? null
      : {
          teamA: {
            id: 'A' as const,
            name: 'Ronaldo',
            color: '#ef4444',
            avatarUrl:
              'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=200&h=200&fit=crop&crop=faces',
          },
          teamB: {
            id: 'B' as const,
            name: 'Messi',
            color: '#3b82f6',
            avatarUrl:
              'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=200&h=200&fit=crop&crop=faces',
          },
          backgroundUrl:
            'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1080&h=1920&fit=crop',
          scoreGoal: 1000,
          commentCooldownMs: 2000,
          intervalDurationMs: 5000,
          giftRules: [
            {
              resourceKey: 'rose',
              targetTeam: 'A' as const,
              pointsPerUnit: 10,
            },
            {
              resourceKey: 'coffee',
              targetTeam: 'B' as const,
              pointsPerUnit: 50,
            },
            {
              resourceKey: 'galaxy',
              targetTeam: 'A' as const,
              pointsPerUnit: 100,
            },
            {
              resourceKey: 'heart',
              targetTeam: 'B' as const,
              pointsPerUnit: 25,
            },
          ],
        });

  const resolvedVariant = activeVariant ?? search.variant;
  const Renderer = getOverlayRenderer(gameId, search.theme, resolvedVariant);

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-neutral-950/40 p-0 sm:p-4 overflow-hidden">
      <main
        data-testid="overlay-canvas"
        className="relative w-full max-w-[540px] md:max-w-[600px] aspect-[9/16] max-h-[96vh] overflow-hidden bg-black select-none mx-auto flex flex-col shadow-2xl rounded-none sm:rounded-2xl border-0 sm:border border-white/10"
      >
        {/* Simulation, Pause and Disconnected Badges */}
        <OverlayStatusBadges
          mode={search.mode}
          isPaused={projection?.isPaused ?? false}
          connected={connected}
        />

        {/* Selected Game & Theme Renderer */}
        <Renderer
          projection={effectiveProjection}
          config={effectiveConfig}
          alerts={alerts}
          celebration={celebration}
          mode={search.mode}
        />

        {/* Audio Playback Activator (if browser blocked autoplay) */}
        <AudioEffectPlayer
          isAudioSuspended={isAudioSuspended}
          onResumeAudio={resumeAudio}
        />
      </main>
    </div>
  );
}
