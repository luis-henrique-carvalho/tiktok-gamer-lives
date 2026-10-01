import {
  ListFilter,
  Trash2,
  Bell,
  Gift,
  MessageSquare,
  Heart,
  Cog,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Typography } from '@/components/ui/typography';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDashboardStore } from '../stores/use-dashboard-store';
import type { LogEvent } from '@/api/types';

const typeIcons: Record<LogEvent['type'], typeof Bell> = {
  alert: Bell,
  gift: Gift,
  comment: MessageSquare,
  like: Heart,
  system: Cog,
};

const typeVariants: Record<
  LogEvent['type'],
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  alert: 'default',
  gift: 'secondary',
  comment: 'outline',
  like: 'outline',
  system: 'secondary',
};

export function EventsHistoryLog() {
  const eventsLog = useDashboardStore((s) => s.eventsLog);
  const clearLog = useDashboardStore((s) => s.clearLog);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>
            <Typography variant="h4" className="flex items-center gap-2">
              <ListFilter className="size-4 text-primary" />
              Histórico de Eventos & Alertas
            </Typography>
          </CardTitle>
          {eventsLog.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearLog}
              className="gap-1 text-xs"
            >
              <Trash2 className="size-3.5" />
              Limpar
            </Button>
          )}
        </div>
        <CardDescription>
          <Typography variant="muted" className="text-xs">
            Feed auditável em tempo real dos últimos {eventsLog.length} eventos
            processados.
          </Typography>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {eventsLog.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed border-border bg-muted/20">
            <Typography variant="muted" className="text-sm">
              Nenhum evento registrado ainda.
            </Typography>
            <Typography variant="muted" className="text-xs mt-1">
              Inicie uma partida ou use o simulador para gerar tráfego.
            </Typography>
          </div>
        ) : (
          <ScrollArea className="h-64 rounded-md border border-border p-2">
            <div className="flex flex-col gap-2">
              {eventsLog.map((event) => {
                const IconComponent = typeIcons[event.type] || Bell;
                const timeString = new Date(
                  event.timestamp,
                ).toLocaleTimeString();

                return (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-2 rounded bg-muted/40 text-xs border border-border/50"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={typeVariants[event.type]}
                        className="gap-1 text-[10px] py-0 px-1.5 uppercase"
                      >
                        <IconComponent className="size-3" />
                        {event.type}
                      </Badge>
                      <Typography
                        variant="small"
                        className="text-xs font-normal"
                      >
                        {event.text}
                      </Typography>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground shrink-0 ml-2">
                      {timeString}
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
