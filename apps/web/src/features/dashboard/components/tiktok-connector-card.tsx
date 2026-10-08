import { useState } from 'react';
import { toast } from 'sonner';
import { Video, Radio, Unplug, Loader2, CheckCircle2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Typography } from '@/components/ui/typography';
import { useDashboardStore } from '../stores/use-dashboard-store';
import { connectTikTok, disconnectTikTok } from '@/api/client';

export function TikTokConnectorCard() {
  const session = useDashboardStore((s) => s.session);
  const tiktokStatus = useDashboardStore((s) => s.tiktokStatus);
  const setTikTokStatus = useDashboardStore((s) => s.setTikTokStatus);
  const addLogEvent = useDashboardStore((s) => s.addLogEvent);

  const [username, setUsername] = useState(tiktokStatus.username ?? '');
  const [loading, setLoading] = useState(false);

  const isConnected = tiktokStatus.status === 'connected';
  const isConnecting = tiktokStatus.status === 'connecting';

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim().replace(/^@/, '');

    if (!cleanUsername) {
      toast.error('Informe o @nome do streamer');
      return;
    }

    if (!session?.id) {
      toast.error('Crie ou selecione uma sessão antes de conectar');
      return;
    }

    setLoading(true);
    try {
      const res = await connectTikTok({
        username: cleanUsername,
        sessionId: session.id,
      });
      setTikTokStatus(res);
      addLogEvent({
        type: 'system',
        text: `Conectado ao TikTok Live @${cleanUsername}.`,
      });
      toast.success(`Conectado à Live de @${cleanUsername}`);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Falha ao conectar TikTok';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await disconnectTikTok();
      setTikTokStatus({
        status: 'disconnected',
        username: null,
        sessionId: null,
      });
      addLogEvent({
        type: 'system',
        text: 'Desconectado do TikTok Live.',
      });
      toast.success('TikTok Live desconectado');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Falha ao desconectar TikTok';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>
            <Typography variant="h4" className="flex items-center gap-2">
              <Video className="size-4 text-primary" />
              Conector TikTok Live
            </Typography>
          </CardTitle>
          <Badge
            variant={
              isConnected ? 'default' : isConnecting ? 'secondary' : 'outline'
            }
            className="gap-1"
          >
            {isConnected ? (
              <>
                <CheckCircle2 className="size-3 text-emerald-400" />
                CONECTADO
              </>
            ) : isConnecting ? (
              <>
                <Loader2 className="size-3 animate-spin" />
                CONECTANDO
              </>
            ) : (
              <>
                <Radio className="size-3 text-muted-foreground" />
                DESCONECTADO
              </>
            )}
          </Badge>
        </div>
        <CardDescription>
          <Typography variant="muted" className="text-xs">
            Capture presentes, comentários e curtidas em tempo real de uma
            transmissão ao vivo.
          </Typography>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="flex flex-col gap-3">
            {/* shadcn-ignore: layout */}
            <div className="flex items-center justify-between p-3 rounded-md bg-muted/40 border border-border">
              <div className="flex flex-col">
                <Typography variant="small" className="font-semibold">
                  @{tiktokStatus.username}
                </Typography>
                <Typography variant="muted" className="text-xs">
                  Sessão: {tiktokStatus.sessionId}
                </Typography>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={loading}
                className="gap-1 text-destructive hover:bg-destructive/10"
              >
                {loading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Unplug className="size-3.5" />
                )}
                Desconectar
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleConnect} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tiktok-username">Streamer TikTok</Label>
              <Input
                id="tiktok-username"
                placeholder="@streamer_username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading || isConnecting}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading || isConnecting}
              className="w-full gap-2"
            >
              {loading || isConnecting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Conectando à Live...
                </>
              ) : (
                <>
                  <Radio className="size-4" />
                  Conectar à Live
                </>
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
