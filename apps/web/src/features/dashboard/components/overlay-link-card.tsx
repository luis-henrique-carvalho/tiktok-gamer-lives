import { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Copy, ExternalLink, Tv, Check } from 'lucide-react';
import { toast } from 'sonner';
import {
  buildOverlayUrl,
  type OverlayTheme,
  type OverlayMode,
} from '@/lib/overlay-url';
import { useDashboardStore } from '../stores/use-dashboard-store';
import { OverlayVolumeControls } from './overlay-volume-controls';

export interface OverlayLinkCardProps {
  readonly sessionId?: string | null;
  readonly isTikTokConnected?: boolean;
}

export function OverlayLinkCard({
  sessionId: propSessionId,
  isTikTokConnected: propIsTikTokConnected,
}: OverlayLinkCardProps) {
  const storeSession = useDashboardStore((s) => s.session);
  const storeTikTokStatus = useDashboardStore((s) => s.tiktokStatus);

  const sessionId = propSessionId ?? storeSession?.id ?? null;
  const isTikTokConnected =
    propIsTikTokConnected ?? storeTikTokStatus?.status === 'connected';

  const [theme, setTheme] = useState<OverlayTheme>('neon');
  const [mode, setMode] = useState<OverlayMode>(
    isTikTokConnected ? 'live' : 'simulation',
  );
  const [volumePercent, setVolumePercent] = useState<number>(60);
  const [muted, setMuted] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isTikTokConnected) {
      setMode('live');
    }
  }, [isTikTokConnected]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const overlayUrl = buildOverlayUrl(origin, {
    sessionId,
    theme,
    mode,
    volume: volumePercent / 100,
    muted,
  });

  const handleCopy = async () => {
    if (!sessionId) {
      toast.error(
        'Crie ou selecione uma sessão antes de copiar a URL do overlay.',
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(overlayUrl);
      setCopied(true);
      toast.success('URL do Overlay copiada para o clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Falha ao copiar URL para a área de transferência.');
    }
  };

  const handleOpen = () => {
    if (!sessionId) {
      toast.error('Nenhuma sessão ativa para abrir o overlay.');
      return;
    }
    window.open(overlayUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card className="rounded-2xl border border-border/80 bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Tv className="size-4" />
          </div>
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Typography variant="small" className="text-base font-bold">
                Link do Overlay OBS
              </Typography>
            </CardTitle>
            <CardDescription className="text-xs">
              Configure e gere a URL do Browser Source (1080×1920 transparente).
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Typography
              variant="small"
              className="text-xs font-semibold text-muted-foreground"
            >
              Tema Visual
            </Typography>
            <Select
              value={theme}
              onValueChange={(val: OverlayTheme) => setTheme(val)}
            >
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue placeholder="Selecione o tema" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="neon">Neon Arena</SelectItem>
                <SelectItem value="minimal">Minimal Broadcast</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Typography
              variant="small"
              className="text-xs font-semibold text-muted-foreground"
            >
              Modo de Operação
            </Typography>
            <Select
              value={mode}
              onValueChange={(val: OverlayMode) => setMode(val)}
            >
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue placeholder="Selecione o modo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="simulation">Simulação</SelectItem>
                <SelectItem value="live">Ao Vivo (TikTok)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <OverlayVolumeControls
          volumePercent={volumePercent}
          muted={muted}
          onVolumeChange={setVolumePercent}
          onMutedChange={setMuted}
        />

        <div className="flex flex-col gap-1">
          <Typography
            variant="small"
            className="text-[11px] font-semibold text-muted-foreground uppercase"
          >
            URL Gerada
          </Typography>
          {/* shadcn-ignore: layout */}
          <div className="p-2 rounded-lg bg-muted/70 border border-border/60 font-mono text-xs truncate select-all text-muted-foreground">
            {overlayUrl}
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0 flex items-center gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={handleCopy}
          disabled={!sessionId}
          className="flex-1 gap-1.5 cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-emerald-400" />
              Copiado!
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              Copiar URL
            </>
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleOpen}
          disabled={!sessionId}
          className="gap-1.5 cursor-pointer"
        >
          <ExternalLink className="size-3.5" />
          Abrir
        </Button>
      </CardFooter>
    </Card>
  );
}
