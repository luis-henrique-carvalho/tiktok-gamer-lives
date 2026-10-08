import { Play, Square, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export interface ContinuousTrafficSectionProps {
  readonly disabled: boolean;
  readonly isRunning: boolean;
  readonly loading: boolean;
  readonly eventsPerSec: string;
  readonly onEventsPerSecChange: (rate: string) => void;
  readonly onToggle: () => void;
}

export function ContinuousTrafficSection({
  disabled,
  isRunning,
  loading,
  eventsPerSec,
  onEventsPerSecChange,
  onToggle,
}: ContinuousTrafficSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="events-rate">Taxa de Eventos (ev/s)</Label>
        <Input
          id="events-rate"
          type="number"
          min={1}
          max={100}
          value={eventsPerSec}
          onChange={(e) => onEventsPerSecChange(e.target.value)}
          disabled={disabled || isRunning || loading}
        />
      </div>

      <Button
        variant={isRunning ? 'destructive' : 'outline'}
        onClick={onToggle}
        disabled={disabled || loading}
        className="gap-2"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : isRunning ? (
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
  );
}
