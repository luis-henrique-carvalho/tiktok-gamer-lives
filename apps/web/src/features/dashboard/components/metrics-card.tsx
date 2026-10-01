import { Activity, Gauge, Cpu, Timer, Layers } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { useDashboardStore } from '../stores/use-dashboard-store';

export function MetricsCard() {
  const metrics = useDashboardStore((s) => s.metrics);

  const formattedEventsCount = new Intl.NumberFormat('pt-BR').format(
    metrics.eventsCount,
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>
          <Typography variant="h4" className="flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            Telemetria & Desempenho
          </Typography>
        </CardTitle>
        <CardDescription>
          <Typography variant="muted" className="text-xs">
            Métricas de vazão, latência e cadência de projeção em tempo real.
          </Typography>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* shadcn-ignore: layout */}
          <div className="flex flex-col p-3 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Layers className="size-3.5" />
              <Typography variant="muted" className="text-[11px] font-medium">
                Eventos Recebidos
              </Typography>
            </div>
            <Typography variant="h4" className="font-mono">
              {formattedEventsCount}
            </Typography>
          </div>

          {/* shadcn-ignore: layout */}
          <div className="flex flex-col p-3 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Gauge className="size-3.5 text-amber-500" />
              <Typography variant="muted" className="text-[11px] font-medium">
                Throughput (ev/s)
              </Typography>
            </div>
            <Typography variant="h4" className="font-mono text-amber-500">
              {metrics.eventsPerSecond}/s
            </Typography>
          </div>

          {/* shadcn-ignore: layout */}
          <div className="flex flex-col p-3 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Cpu className="size-3.5 text-emerald-500" />
              <Typography variant="muted" className="text-[11px] font-medium">
                Snapshots / seg
              </Typography>
            </div>
            <Typography variant="h4" className="font-mono text-emerald-500">
              {metrics.snapshotsPerSecond} fps
            </Typography>
          </div>

          {/* shadcn-ignore: layout */}
          <div className="flex flex-col p-3 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Timer className="size-3.5 text-blue-500" />
              <Typography variant="muted" className="text-[11px] font-medium">
                Latência
              </Typography>
            </div>
            <Typography variant="h4" className="font-mono text-blue-500">
              {metrics.latencyMs} ms
            </Typography>
          </div>

          {/* shadcn-ignore: layout */}
          <div className="flex flex-col p-3 rounded-lg border border-border bg-muted/30 col-span-2 sm:col-span-2">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Activity className="size-3.5 text-indigo-500" />
              <Typography variant="muted" className="text-[11px] font-medium">
                Sequência
              </Typography>
            </div>
            <Typography variant="h4" className="font-mono text-indigo-500">
              #{metrics.sequence}
            </Typography>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
