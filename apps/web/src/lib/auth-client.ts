import { createAuthClient } from 'better-auth/react';

export const getAuthBaseUrl = (): string => {
  // In the browser, route through Vite's reverse proxy (/api/auth) to ensure same-origin cookies and no CORS preflights
  if (
    typeof window !== 'undefined' &&
    window.location?.origin &&
    window.location.origin !== 'null'
  ) {
    return window.location.origin;
  }
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env.VITE_AUTH_URL) {
      return import.meta.env.VITE_AUTH_URL;
    }
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
  }
  return 'http://localhost:5180';
};

export const authClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
});
