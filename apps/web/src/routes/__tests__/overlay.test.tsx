import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OverlayPage } from '../overlay';

describe('OverlayPage Route Component', () => {
  it('renders overlay header and preview badge', () => {
    render(<OverlayPage />);

    expect(screen.getByText('OBS Overlay HUD')).toBeInTheDocument();
    expect(screen.getByText('Fase 7 Preview')).toBeInTheDocument();
  });
});
