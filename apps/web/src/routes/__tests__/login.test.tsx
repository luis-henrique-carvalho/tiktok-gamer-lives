import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoginPage, checkLoginAuth } from '../login';
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

vi.mock('@/features/auth/views/login-view', () => ({
  LoginView: ({ onSuccess }: { onSuccess?: () => void }) => (
    <div data-testid="login-view-component">
      <button onClick={onSuccess}>Success Button</button>
    </div>
  ),
}));

describe('LoginPage Route Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders LoginView component inside page and navigates on success', () => {
    render(<LoginPage />);
    expect(screen.getByTestId('login-view-component')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Success Button'));
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/dashboard' });
  });

  it('checkLoginAuth redirects to /dashboard if session exists', async () => {
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

    await expect(checkLoginAuth()).rejects.toThrow('Redirect');
    expect(mockRedirect).toHaveBeenCalledWith({ to: '/dashboard' });
  });

  it('checkLoginAuth does not redirect if user is unauthenticated', async () => {
    vi.mocked(authClient.getSession).mockResolvedValue({
      data: null,
      error: null,
    });

    await expect(checkLoginAuth()).resolves.toBeUndefined();
  });
});
