import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { Volume2, VolumeX } from 'lucide-react';

export interface AudioEffectPlayerProps {
  readonly isAudioSuspended: boolean;
  readonly onResumeAudio: () => void;
}

export function AudioEffectPlayer({
  isAudioSuspended,
  onResumeAudio,
}: AudioEffectPlayerProps) {
  if (!isAudioSuspended) {
    return null;
  }

  return (
    <aside
      aria-label="Ativação de Áudio"
      className="absolute bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-2 duration-300"
    >
      <Button
        variant="secondary"
        size="sm"
        onClick={onResumeAudio}
        className="rounded-full shadow-lg border border-primary/40 bg-background/90 backdrop-blur-md hover:bg-background flex items-center gap-2 px-4 py-2 cursor-pointer"
      >
        <VolumeX className="size-4 text-amber-500 animate-pulse" />
        <Typography
          variant="small"
          className="text-xs font-semibold text-foreground flex items-center gap-1.5"
        >
          <Volume2 className="size-3.5 text-primary" />
          Clique para ativar áudio
        </Typography>
      </Button>
    </aside>
  );
}
