import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../../../../app.js';
import { runMigrations } from '../../../../../common/infrastructure/database/drizzle/migrate.js';

describe('Better Auth HTTP Integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await runMigrations();
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should sign up a new user with email and password', async () => {
    const uniqueEmail = `streamer_${randomUUID()}@example.com`;
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      headers: {
        'content-type': 'application/json',
      },
      payload: {
        email: uniqueEmail,
        password: 'Password123!',
        name: 'Streamer Test',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('user');
    expect(body.user.email).toBe(uniqueEmail);
    expect(body.user.name).toBe('Streamer Test');
    expect(response.headers['set-cookie']).toBeDefined();
  });

  it('should sign in an existing user with correct credentials', async () => {
    const uniqueEmail = `login_${randomUUID()}@example.com`;

    // Sign up first
    await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      headers: {
        'content-type': 'application/json',
      },
      payload: {
        email: uniqueEmail,
        password: 'SecurePassword123!',
        name: 'Login Streamer',
      },
    });

    // Sign in
    const signInResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      headers: {
        'content-type': 'application/json',
      },
      payload: {
        email: uniqueEmail,
        password: 'SecurePassword123!',
      },
    });

    expect(signInResponse.statusCode).toBe(200);
    const body = JSON.parse(signInResponse.body);
    expect(body).toHaveProperty('user');
    expect(body.user.email).toBe(uniqueEmail);
    expect(signInResponse.headers['set-cookie']).toBeDefined();
  });

  it('should reject sign in with invalid password', async () => {
    const uniqueEmail = `wrongpass_${randomUUID()}@example.com`;

    // Sign up
    await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      headers: {
        'content-type': 'application/json',
      },
      payload: {
        email: uniqueEmail,
        password: 'CorrectPassword123!',
        name: 'Wrong Pass User',
      },
    });

    // Sign in with wrong pass
    const signInResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      headers: {
        'content-type': 'application/json',
      },
      payload: {
        email: uniqueEmail,
        password: 'WrongPassword!',
      },
    });

    expect(signInResponse.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('should retrieve session with active session cookie', async () => {
    const uniqueEmail = `session_${randomUUID()}@example.com`;

    const signUpResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      headers: {
        'content-type': 'application/json',
      },
      payload: {
        email: uniqueEmail,
        password: 'Password123!',
        name: 'Session User',
      },
    });

    expect(signUpResponse.statusCode).toBe(200);
    const setCookie = signUpResponse.headers['set-cookie'];
    const cookieHeader = Array.isArray(setCookie)
      ? setCookie.join('; ')
      : (setCookie as string);

    const sessionResponse = await app.inject({
      method: 'GET',
      url: '/api/auth/get-session',
      headers: {
        cookie: cookieHeader,
      },
    });

    expect(sessionResponse.statusCode).toBe(200);
    const sessionBody = JSON.parse(sessionResponse.body);
    expect(sessionBody).toHaveProperty('user');
    expect(sessionBody.user.email).toBe(uniqueEmail);
    expect(sessionBody).toHaveProperty('session');
  });

  it('should return null or 200/empty session when requesting session without cookies', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/get-session',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toBeNull();
  });

  it('should sign out successfully with active session cookie', async () => {
    const uniqueEmail = `signout_${randomUUID()}@example.com`;

    const signUpResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      headers: {
        'content-type': 'application/json',
      },
      payload: {
        email: uniqueEmail,
        password: 'Password123!',
        name: 'Signout User',
      },
    });

    const setCookie = signUpResponse.headers['set-cookie'];
    const cookieHeader = Array.isArray(setCookie)
      ? setCookie.join('; ')
      : (setCookie as string);

    const signOutResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-out',
      headers: {
        cookie: cookieHeader,
      },
    });

    expect(signOutResponse.statusCode).toBe(200);
  });

  it('should correctly handle array headers and string body', async () => {
    const uniqueEmail = `raw_${randomUUID()}@example.com`;
    const payloadStr = JSON.stringify({
      email: uniqueEmail,
      password: 'Password123!',
      name: 'Raw User',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      headers: {
        'content-type': 'application/json',
        'x-custom-array': ['val1', 'val2'] as unknown as string,
      },
      payload: payloadStr,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.user.email).toBe(uniqueEmail);
  });

  it('should handle non-existent auth routes correctly', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/non-existent-subpath-for-testing',
    });

    expect(response.statusCode).toBe(404);
  });
});
