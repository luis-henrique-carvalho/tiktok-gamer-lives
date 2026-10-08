import { ShieldCheck } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Typography } from '@/components/ui/typography';
import { LoginForm } from '../components/login-form';

interface LoginViewProps {
  readonly onSuccess?: () => void;
}

export function LoginView({ onSuccess }: LoginViewProps) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md shadow-2xl border-border">
        <CardHeader className="space-y-2 text-center pb-2">
          <div className="flex justify-center">
            <Badge variant="outline" className="gap-1.5 py-1 px-3">
              <ShieldCheck className="size-4 text-primary" />
              <span>Controle de Acesso</span>
            </Badge>
          </div>
          <CardTitle>
            <Typography variant="h3">Painel do Operador</Typography>
          </CardTitle>
          <CardDescription>
            <Typography variant="muted" className="text-sm">
              Autentique-se para gerenciar as partidas interativas, conexões
              TikTok e telemetria em tempo real.
            </Typography>
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <LoginForm onSuccess={onSuccess} />
        </CardContent>
      </Card>
    </main>
  );
}
