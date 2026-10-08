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
}

export function OverlayView({ search }: OverlayViewProps) {
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

  if (!search.sessionId) {
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

  const Renderer = getOverlayRenderer(gameId, search.theme);

  return (
    <main
      data-testid="overlay-canvas"
      className="relative w-[1080px] h-[1920px] max-w-full overflow-hidden bg-transparent select-none mx-auto flex flex-col"
    >
      {/* Simulation, Pause and Disconnected Badges */}
      <OverlayStatusBadges
        mode={search.mode}
        isPaused={projection?.isPaused ?? false}
        connected={connected}
      />

      {/* Selected Game & Theme Renderer */}
      <Renderer
        projection={projection}
        config={config}
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
  );
}
