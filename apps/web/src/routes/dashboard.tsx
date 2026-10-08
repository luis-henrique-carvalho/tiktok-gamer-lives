import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { authClient } from '@/lib/auth-client';
import { DashboardView } from '@/features/dashboard/views/dashboard-view';

export async function checkDashboardAuth() {
  try {
    const session = await authClient.getSession();
    if (!session?.data?.user) {
      throw redirect({
        to: '/login',
      });
    }
  } catch (err) {
    if (
      (err as { isRedirect?: boolean })?.isRedirect ||
      (err as { to?: string })?.to
    ) {
      throw err;
    }
    throw redirect({
      to: '/login',
    });
  }
}

export const Route = createFileRoute('/dashboard')({
  beforeLoad: checkDashboardAuth,
  component: DashboardPage,
});

export function DashboardPage() {
  const navigate = useNavigate();

  const handleSignOut = () => {
    navigate({ to: '/login' });
  };

  return <DashboardView onSignOut={handleSignOut} />;
}
