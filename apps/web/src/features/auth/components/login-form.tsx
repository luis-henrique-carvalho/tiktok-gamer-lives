import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { authClient } from '@/lib/auth-client';

interface LoginFormProps {
  readonly onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);

  // Sign In fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign Up fields
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const response = await authClient.signIn.email({
        email: loginEmail,
        password: loginPassword,
      });

      if (response?.error) {
        toast.error(response.error.message || 'Falha ao autenticar');
      } else {
        toast.success('Autenticado com sucesso!');
        onSuccess?.();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao realizar login';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerName || !registerEmail || !registerPassword) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const response = await authClient.signUp.email({
        name: registerName,
        email: registerEmail,
        password: registerPassword,
      });

      if (response?.error) {
        toast.error(response.error.message || 'Falha ao registrar conta');
      } else {
        toast.success('Conta criada com sucesso!');
        onSuccess?.();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar conta';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tabs
      value={mode}
      onValueChange={(val) => setMode(val as 'signin' | 'signup')}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="signin" className="gap-2">
          <LogIn className="size-4" />
          Entrar
        </TabsTrigger>
        <TabsTrigger value="signup" className="gap-2">
          <UserPlus className="size-4" />
          Criar Conta
        </TabsTrigger>
      </TabsList>

      <TabsContent value="signin" className="mt-4">
        <form onSubmit={handleSignIn} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="login-email">E-mail</Label>
            <Input
              id="login-email"
              type="email"
              placeholder="operador@live.com"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="login-password">Senha</Label>
            <Input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full mt-2">
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                Entrando...
              </>
            ) : (
              'Entrar na Plataforma'
            )}
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="signup" className="mt-4">
        <form onSubmit={handleSignUp} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="register-name">Nome Completo</Label>
            <Input
              id="register-name"
              type="text"
              placeholder="Nome do Operador"
              value={registerName}
              onChange={(e) => setRegisterName(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="register-email">E-mail</Label>
            <Input
              id="register-email"
              type="email"
              placeholder="operador@live.com"
              value={registerEmail}
              onChange={(e) => setRegisterEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="register-password">Senha</Label>
            <Input
              id="register-password"
              type="password"
              placeholder="••••••••"
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full mt-2">
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                Criando conta...
              </>
            ) : (
              'Criar Minha Conta'
            )}
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  );
}
