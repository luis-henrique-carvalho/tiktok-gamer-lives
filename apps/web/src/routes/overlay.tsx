import { createFileRoute } from '@tanstack/react-router';
import { Radio, Swords } from 'lucide-react';
import { Typography } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';

export const Route = createFileRoute('/overlay')({
  component: OverlayPage,
});

export function OverlayPage() {
  return (
    <main className="min-h-screen bg-transparent p-6 flex flex-col items-center justify-start text-foreground">
      <div className="flex items-center gap-2 p-3 rounded-lg bg-background/80 backdrop-blur border border-border/60 shadow-lg">
        <Radio className="size-4 text-primary animate-pulse" />
        <Typography
          variant="small"
          className="font-semibold flex items-center gap-1.5"
        >
          <Swords className="size-4 text-primary" />
          OBS Overlay HUD
        </Typography>
        <Badge variant="outline" className="text-[10px]">
          Fase 7 Preview
        </Badge>
      </div>
    </main>
  );
}
