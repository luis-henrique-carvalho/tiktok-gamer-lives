import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAuthBaseUrl, authClient } from '../auth-client';

describe('authClient', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it('should compute valid auth base URL and initialize client', () => {
    const url = getAuthBaseUrl();
    expect(url).toBeDefined();
    expect(typeof url).toBe('string');
    expect(authClient).toBeDefined();
    expect(typeof authClient.signIn.email).toBe('function');
  });

  it('should use window.location.origin when available in browser', () => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:5180' },
      writable: true,
      configurable: true,
    });
    expect(getAuthBaseUrl()).toBe('http://localhost:5180');
  });

  it('should fallback to env or default when window.location.origin is invalid or null', () => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'null' },
      writable: true,
      configurable: true,
    });
    const url = getAuthBaseUrl();
    expect(url).toBeDefined();
    expect(typeof url).toBe('string');
  });
});
