import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from '../components/login-form';
import { authClient } from '@/lib/auth-client';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    signIn: {
      email: vi.fn(),
    },
    signUp: {
      email: vi.fn(),
    },
    getSession: vi.fn(),
  },
}));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form tab by default with email and password inputs', () => {
    render(<LoginForm />);

    expect(screen.getByRole('tab', { name: /entrar/i })).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: /criar conta/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /entrar na plataforma/i }),
    ).toBeInTheDocument();
  });

  it('switches to sign up tab and renders name field', async () => {
    render(<LoginForm />);

    const registerTab = screen.getByRole('tab', { name: /criar conta/i });
    fireEvent.click(registerTab);
    fireEvent.keyDown(registerTab, { key: 'Enter' });

    expect(await screen.findByLabelText(/nome completo/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /criar minha conta/i }),
    ).toBeInTheDocument();
  });

  it('calls authClient.signIn.email on login submit and handles success', async () => {
    const onSuccess = vi.fn();
    vi.mocked(authClient.signIn.email).mockResolvedValue({
      data: {
        user: {
          id: 'u1',
          email: 'test@example.com',
          name: 'Test',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        session: {
          id: 's1',
          userId: 'u1',
          token: 'token',
          expiresAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      error: null,
    });

    render(<LoginForm onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText(/e-mail/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/senha/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(
      screen.getByRole('button', { name: /entrar na plataforma/i }),
    );

    await waitFor(() => {
      expect(authClient.signIn.email).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(toast.success).toHaveBeenCalledWith('Autenticado com sucesso!');
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('handles login error response with toast.error', async () => {
    vi.mocked(authClient.signIn.email).mockResolvedValue({
      data: null,
      error: {
        message: 'Credenciais inválidas',
        status: 401,
        statusText: 'Unauthorized',
      },
    });

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/e-mail/i), {
      target: { value: 'wrong@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/senha/i), {
      target: { value: 'wrongpass' },
    });

    fireEvent.click(
      screen.getByRole('button', { name: /entrar na plataforma/i }),
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Credenciais inválidas');
    });
  });

  it('calls authClient.signUp.email on register submit and handles success', async () => {
    const onSuccess = vi.fn();
    vi.mocked(authClient.signUp.email).mockResolvedValue({
      data: {
        user: {
          id: 'u2',
          email: 'new@example.com',
          name: 'Novo Operador',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        session: {
          id: 's2',
          userId: 'u2',
          token: 'token',
          expiresAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      error: null,
    });

    render(<LoginForm onSuccess={onSuccess} />);

    const registerTab = screen.getByRole('tab', { name: /criar conta/i });
    fireEvent.click(registerTab);
    fireEvent.keyDown(registerTab, { key: 'Enter' });

    fireEvent.change(await screen.findByLabelText(/nome completo/i), {
      target: { value: 'Novo Operador' },
    });
    fireEvent.change(
      screen.getAllByLabelText(/e-mail/i)[1] ||
        screen.getByLabelText(/e-mail/i),
      {
        target: { value: 'new@example.com' },
      },
    );
    fireEvent.change(
      screen.getAllByLabelText(/senha/i)[1] || screen.getByLabelText(/senha/i),
      {
        target: { value: 'secret123' },
      },
    );

    fireEvent.click(screen.getByRole('button', { name: /criar minha conta/i }));

    await waitFor(() => {
      expect(authClient.signUp.email).toHaveBeenCalledWith({
        name: 'Novo Operador',
        email: 'new@example.com',
        password: 'secret123',
      });
      expect(toast.success).toHaveBeenCalledWith('Conta criada com sucesso!');
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
