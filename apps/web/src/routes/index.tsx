import { createFileRoute } from '@tanstack/react-router';
import { Activity, Radio, Sparkles, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';

export const Route = createFileRoute('/')({
  component: IndexPage,
});

export function IndexPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-xl shadow-xl">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="gap-1.5 py-1">
              <Radio className="size-3.5 text-primary animate-pulse" />
              <span>Fase 1 — Fundação</span>
            </Badge>
            <Badge variant="secondary" className="gap-1 py-1">
              <Activity className="size-3.5" />
              <span>Status: Ativo</span>
            </Badge>
          </div>
          <CardTitle>
            <Typography variant="h2">
              Plataforma de Lives Interativas — Online
            </Typography>
          </CardTitle>
          <CardDescription>
            <Typography variant="muted">
              Infraestrutura moderna de streaming interativo alimentada por
              TanStack Router, React 19, Tailwind CSS v4 e Shadcn UI.
            </Typography>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-muted/40">
              <CardHeader className="p-4">
                <CardTitle>
                  <Typography
                    variant="small"
                    className="flex items-center gap-1.5"
                  >
                    <Zap className="size-4 text-primary" />
                    Ultra Baixa Latência
                  </Typography>
                </CardTitle>
                <CardDescription>
                  <Typography variant="muted" className="text-xs">
                    Comunicação em tempo real via WebSockets e pipelines
                    otimizados.
                  </Typography>
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-muted/40">
              <CardHeader className="p-4">
                <CardTitle>
                  <Typography
                    variant="small"
                    className="flex items-center gap-1.5"
                  >
                    <Sparkles className="size-4 text-accent-foreground" />
                    Gamificação
                  </Typography>
                </CardTitle>
                <CardDescription>
                  <Typography variant="muted" className="text-xs">
                    Interações de chat dinâmicas, votos e recompensas
                    integradas.
                  </Typography>
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between pt-2">
          <Typography variant="small" className="text-muted-foreground">
            v0.1.0-alpha • Enterprise Mod 2
          </Typography>
          <a
            href="/dashboard"
            className={buttonVariants({ variant: 'default', size: 'sm' })}
          >
            Explorar Dashboard
          </a>
        </CardFooter>
      </Card>
    </main>
  );
}
