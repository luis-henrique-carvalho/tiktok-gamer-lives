import { useState } from 'react';
import { toast } from 'sonner';
import { Settings, PlusCircle, Loader2 } from 'lucide-react';
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
import { Typography } from '@/components/ui/typography';
import { useDashboardStore } from '../stores/use-dashboard-store';
import { createSession } from '@/api/client';
import { realtimeClient } from '@/lib/socket-client';
import { TeamConfigFields } from './team-config-fields';
import type { AxBConfig, AxBGiftRule } from '@/api/types';

const DEFAULT_GIFT_RULES: readonly AxBGiftRule[] = [
  { resourceKey: 'tiktok:gift:5655', targetTeam: 'A', pointsPerUnit: 10 },
  { resourceKey: 'tiktok:gift:5879', targetTeam: 'B', pointsPerUnit: 10 },
  { resourceKey: 'tiktok:gift:5827', targetTeam: 'A', pointsPerUnit: 50 },
  { resourceKey: 'tiktok:gift:6064', targetTeam: 'B', pointsPerUnit: 50 },
];

export function AxBConfigForm() {
  const setSession = useDashboardStore((s) => s.setSession);
  const addLogEvent = useDashboardStore((s) => s.addLogEvent);

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('Batalha A x B');
  const [teamAName, setTeamAName] = useState('Time Vermelho');
  const [teamAColor, setTeamAColor] = useState('#ef4444');
  const [teamAAvatar, setTeamAAvatar] = useState('');
  const [teamBName, setTeamBName] = useState('Time Azul');
  const [teamBColor, setTeamBColor] = useState('#3b82f6');
  const [teamBAvatar, setTeamBAvatar] = useState('');
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [scoreGoal, setScoreGoal] = useState('1000');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const config: AxBConfig & { backgroundUrl?: string } = {
      teamA: {
        id: 'A',
        name: teamAName,
        color: teamAColor,
        ...(teamAAvatar ? { avatarUrl: teamAAvatar } : {}),
      },
      teamB: {
        id: 'B',
        name: teamBName,
        color: teamBColor,
        ...(teamBAvatar ? { avatarUrl: teamBAvatar } : {}),
      },
      scoreGoal: Number(scoreGoal) || 1000,
      commentCooldownMs: 1000,
      intervalDurationMs: 5000,
      giftRules: DEFAULT_GIFT_RULES,
      ...(backgroundUrl ? { backgroundUrl } : {}),
    };

    try {
      const created = await createSession({
        gameId: 'axb',
        operatorId: 'operator-default',
        title,
        config,
      });

      setSession(created);
      realtimeClient.joinSession(created.id);
      addLogEvent({
        type: 'system',
        text: `Nova partida criada: "${created.title}" (Meta: ${config.scoreGoal} pts).`,
      });
      toast.success('Sessão A x B criada com sucesso!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao criar sessão';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>
          <Typography variant="h4" className="flex items-center gap-2">
            <Settings className="size-4 text-primary" />
            Configurar Partida A x B
          </Typography>
        </CardTitle>
        <CardDescription>
          <Typography variant="muted" className="text-xs">
            Defina competidores, meta de pontos e regras de pontuação por
            presentes.
          </Typography>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="session-title">Título da Partida</Label>
            <Input
              id="session-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Batalha dos Clãs"
              disabled={loading}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TeamConfigFields
              teamKey="A"
              name={teamAName}
              color={teamAColor}
              avatar={teamAAvatar}
              loading={loading}
              onNameChange={setTeamAName}
              onColorChange={setTeamAColor}
              onAvatarChange={setTeamAAvatar}
            />

            <TeamConfigFields
              teamKey="B"
              name={teamBName}
              color={teamBColor}
              avatar={teamBAvatar}
              loading={loading}
              onNameChange={setTeamBName}
              onColorChange={setTeamBColor}
              onAvatarChange={setTeamBAvatar}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="background-url">Imagem de Fundo (Wallpaper)</Label>
            <Input
              id="background-url"
              type="url"
              placeholder="https://... (opcional ou vazio para transparente/OBS)"
              value={backgroundUrl}
              onChange={(e) => setBackgroundUrl(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="score-goal">Meta de Pontos</Label>
            <Input
              id="score-goal"
              type="number"
              min={10}
              max={100000}
              value={scoreGoal}
              onChange={(e) => setScoreGoal(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full gap-2 mt-1"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <PlusCircle className="size-4" />
                Criar Sessão A x B
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
