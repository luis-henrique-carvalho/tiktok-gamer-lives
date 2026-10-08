import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoginView } from '../views/login-view';

vi.mock('../components/login-form', () => ({
  LoginForm: ({ onSuccess }: { onSuccess?: () => void }) => (
    <div data-testid="mock-login-form">
      <button onClick={onSuccess}>Trigger Success</button>
    </div>
  ),
}));

describe('LoginView', () => {
  it('renders login view with header, card and login form', () => {
    render(<LoginView />);

    expect(screen.getByText(/painel do operador/i)).toBeInTheDocument();
    expect(
      screen.getByText(/autentique-se para gerenciar as partidas/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId('mock-login-form')).toBeInTheDocument();
  });
});
