import { render } from '@testing-library/react';
import type * as TanstackReactRouter from '@tanstack/react-router';
import { describe, expect, it, vi } from 'vitest';
import { Route } from '../__root';

// Mock TanStack Router Devtools and Outlet
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof TanstackReactRouter>(
    '@tanstack/react-router',
  );
  return {
    ...actual,
    Outlet: () => <div data-testid="router-outlet">Outlet Content</div>,
  };
});

vi.mock('@tanstack/react-router-devtools', () => ({
  TanStackRouterDevtools: () => (
    <div data-testid="router-devtools">Router Devtools</div>
  ),
}));

describe('Root Route Component', () => {
  it('renders root layout with Outlet and providers', () => {
    const Component = Route.options.component;
    expect(Component).toBeDefined();
    if (Component) {
      const { getByTestId } = render(<Component />);
      expect(getByTestId('router-outlet')).toBeInTheDocument();
    }
  });
});
