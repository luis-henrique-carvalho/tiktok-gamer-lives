import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DashboardPage, checkDashboardAuth } from '../dashboard';
import { authClient } from '@/lib/auth-client';

const mockNavigate = vi.fn();
const mockRedirect = vi.fn((opts: { to: string }) => {
  const err = Object.assign(new Error('Redirect'), {
    isRedirect: true,
    to: opts.to,
  });
  return err;
});

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
  useNavigate: () => mockNavigate,
  redirect: (opts: { to: string }) => mockRedirect(opts),
}));

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    getSession: vi.fn(),
  },
}));

vi.mock('@/features/dashboard/views/dashboard-view', () => ({
  DashboardView: ({ onSignOut }: { onSignOut?: () => void }) => (
    <div data-testid="dashboard-view-component">
      <button onClick={onSignOut}>Sign Out</button>
    </div>
  ),
}));

describe('DashboardPage Route Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders DashboardView component and handles sign out navigation', () => {
    render(<DashboardPage />);
    expect(screen.getByTestId('dashboard-view-component')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Sign Out'));
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/login' });
  });

  it('checkDashboardAuth allows authenticated user without redirecting', async () => {
    vi.mocked(authClient.getSession).mockResolvedValue({
      data: {
        user: {
          id: 'u1',
          email: 'test@test.com',
          name: 'Test',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        session: {
          id: 's1',
          userId: 'u1',
          token: 'tok',
          expiresAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      error: null,
    });

    await expect(checkDashboardAuth()).resolves.toBeUndefined();
  });

  it('checkDashboardAuth redirects unauthenticated user to /login', async () => {
    vi.mocked(authClient.getSession).mockResolvedValue({
      data: null,
      error: null,
    });

    await expect(checkDashboardAuth()).rejects.toThrow('Redirect');
    expect(mockRedirect).toHaveBeenCalledWith({ to: '/login' });
  });

  it('checkDashboardAuth catches error from getSession and redirects to /login', async () => {
    vi.mocked(authClient.getSession).mockRejectedValue(
      new Error('Network error'),
    );

    await expect(checkDashboardAuth()).rejects.toThrow('Redirect');
    expect(mockRedirect).toHaveBeenCalledWith({ to: '/login' });
  });
});
