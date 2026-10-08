import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { authClient } from '@/lib/auth-client';
import { LoginView } from '@/features/auth/views/login-view';

export async function checkLoginAuth() {
  try {
    const session = await authClient.getSession();
    if (session?.data?.user) {
      throw redirect({
        to: '/dashboard',
      });
    }
  } catch (err) {
    if (
      (err as { isRedirect?: boolean })?.isRedirect ||
      (err as { to?: string })?.to
    ) {
      throw err;
    }
  }
}

export const Route = createFileRoute('/login')({
  beforeLoad: checkLoginAuth,
  component: LoginPage,
});

export function LoginPage() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate({ to: '/dashboard' });
  };

  return <LoginView onSuccess={handleSuccess} />;
}
