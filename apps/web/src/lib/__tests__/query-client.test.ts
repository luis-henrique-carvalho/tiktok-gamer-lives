import { describe, expect, it } from 'vitest';
import { queryClient } from '../query-client';

describe('queryClient', () => {
  it('instantiates with expected default configuration', () => {
    expect(queryClient).toBeDefined();
    const defaultOptions = queryClient.getDefaultOptions();
    expect(defaultOptions.queries?.staleTime).toBe(1000 * 60 * 5);
    expect(defaultOptions.queries?.retry).toBe(1);
    expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false);
  });
});
