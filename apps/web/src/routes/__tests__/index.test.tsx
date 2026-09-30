import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IndexPage } from '../index';

describe('IndexPage Route Component', () => {
  it('renders title and status badges', () => {
    render(<IndexPage />);

    expect(
      screen.getByText('Plataforma de Lives Interativas — Online'),
    ).toBeInTheDocument();
    expect(screen.getByText('Fase 1 — Fundação')).toBeInTheDocument();
    expect(screen.getByText('Status: Ativo')).toBeInTheDocument();
  });

  it('renders features and interactive action button', () => {
    render(<IndexPage />);

    expect(screen.getByText('Ultra Baixa Latência')).toBeInTheDocument();
    expect(screen.getByText('Gamificação')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Explorar Dashboard/i }),
    ).toBeInTheDocument();
  });
});
