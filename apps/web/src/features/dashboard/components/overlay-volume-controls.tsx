import { useId } from 'react';
import { Typography } from '@/components/ui/typography';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Volume2, VolumeX } from 'lucide-react';

export interface OverlayVolumeControlsProps {
  readonly volumePercent: number;
  readonly muted: boolean;
  readonly onVolumeChange: (val: number) => void;
  readonly onMutedChange: (val: boolean) => void;
}

export function OverlayVolumeControls({
  volumePercent,
  muted,
  onVolumeChange,
  onMutedChange,
}: OverlayVolumeControlsProps) {
  const muteSwitchId = useId();

  return (
    <div className="flex flex-col gap-2 pt-1 border-t border-border/60">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          {muted ? (
            <VolumeX className="size-3.5 text-destructive" />
          ) : (
            <Volume2 className="size-3.5 text-primary" />
          )}
          <Typography variant="small" className="text-xs">
            Volume dos Efeitos ({muted ? 'Mudo' : `${volumePercent}%`})
          </Typography>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor={muteSwitchId}
            className="text-xs text-muted-foreground cursor-pointer select-none"
          >
            Mudo
          </label>
          <Switch
            id={muteSwitchId}
            checked={muted}
            onCheckedChange={onMutedChange}
            aria-label="Silenciar efeitos sonoros"
          />
        </div>
      </div>

      <Slider
        value={[volumePercent]}
        onValueChange={([val]) => onVolumeChange(val)}
        min={0}
        max={100}
        step={5}
        disabled={muted}
        className="w-full"
        aria-label="Controle de volume"
      />
    </div>
  );
}
