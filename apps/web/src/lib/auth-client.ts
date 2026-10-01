import { createAuthClient } from 'better-auth/react';

export const getAuthBaseUrl = (): string => {
  if (
    typeof window !== 'undefined' &&
    window.location?.origin &&
    window.location.origin !== 'null'
  ) {
    return window.location.origin;
  }
  return 'http://localhost:3000';
};

export const authClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
});
