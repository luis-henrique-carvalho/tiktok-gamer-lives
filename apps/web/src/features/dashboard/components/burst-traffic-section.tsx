import { Flame, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';

export interface BurstTrafficSectionProps {
  readonly disabled: boolean;
  readonly loading: boolean;
  readonly onBurst: () => void;
}

export function BurstTrafficSection({
  disabled,
  loading,
  onBurst,
}: BurstTrafficSectionProps) {
  return (
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
        onClick={onBurst}
        disabled={disabled || loading}
        className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
      >
        {loading ? (
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
  );
}
