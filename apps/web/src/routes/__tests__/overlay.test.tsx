import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OverlayRouteComponent, Route } from '../overlay';

describe('OverlayRouteComponent', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it('renders OverlayView with parsed search parameters', () => {
    vi.spyOn(Route, 'useSearch').mockReturnValue({
      sessionId: null,
      theme: 'neon',
      mode: 'simulation',
      volume: 0.6,
      muted: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <OverlayRouteComponent />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Sessão não especificada')).toBeInTheDocument();
  });
});
