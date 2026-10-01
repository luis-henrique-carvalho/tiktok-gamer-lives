import { describe, it, expect } from 'vitest';
import { getAuthBaseUrl, authClient } from '../auth-client';

describe('authClient', () => {
  it('should compute valid auth base URL and initialize client', () => {
    const url = getAuthBaseUrl();
    expect(url).toBeDefined();
    expect(typeof url).toBe('string');
    expect(authClient).toBeDefined();
    expect(typeof authClient.signIn.email).toBe('function');
  });
});
