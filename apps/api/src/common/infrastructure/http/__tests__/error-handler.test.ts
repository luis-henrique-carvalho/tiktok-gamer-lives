import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../../../app.js';
import { BadRequestError } from '../../../domain/errors/bad-request-error.js';
import { ForbiddenError } from '../../../domain/errors/forbidden-error.js';
import { NotFoundError } from '../../../domain/errors/not-found-error.js';
import { UnauthorizedError } from '../../../domain/errors/unauthorized-error.js';
import { UnprocessableEntityError } from '../../../domain/errors/unprocessable-entity-error.js';

describe('global HTTP error handling', () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
  });

  it.each([
    [new BadRequestError('Bad input'), 400],
    [new UnauthorizedError('Login required'), 401],
    [new ForbiddenError('Access denied'), 403],
    [new NotFoundError('Session not found'), 404],
  ])('maps %s to HTTP %i', async (error, status) => {
    app = await buildApp({ logger: false });
    app.get('/test-error', async () => {
      throw error;
    });

    const response = await app.inject({ method: 'GET', url: '/test-error' });
    expect(response.statusCode).toBe(status);
    expect(response.json()).toEqual({ status, message: error.message });
  });

  it('returns field errors for application validation', async () => {
    app = await buildApp({ logger: false });
    app.get('/test-error', async () => {
      throw new UnprocessableEntityError([
        { field: 'name', message: 'Name is required' },
      ]);
    });

    const response = await app.inject({ method: 'GET', url: '/test-error' });
    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({
      status: 422,
      message: 'Field validation error',
      errors: [{ field: 'name', message: 'Name is required' }],
    });
  });

  it('returns field paths for Zod validation', async () => {
    app = await buildApp({ logger: false });
    app.get('/test-error', async () => {
      z.object({ profile: z.object({ email: z.string().email() }) }).parse({
        profile: { email: 'invalid' },
      });
    });

    const response = await app.inject({ method: 'GET', url: '/test-error' });
    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({
      status: 422,
      message: 'Field validation error',
      errors: [{ field: 'profile.email' }],
    });
  });

  it('hides details of unexpected failures', async () => {
    app = await buildApp({ logger: false });
    app.get('/test-error', async () => {
      throw new Error('secret details');
    });

    const response = await app.inject({ method: 'GET', url: '/test-error' });
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      status: 500,
      message: 'Internal server error',
    });
  });

  it('preserves client errors raised by Fastify', async () => {
    app = await buildApp({ logger: false });
    app.post('/test-body', async () => ({ ok: true }));

    const response = await app.inject({
      method: 'POST',
      url: '/test-body',
      headers: { 'content-type': 'application/json' },
      payload: '{invalid-json',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ status: 400 });
  });

  it('formats unknown routes consistently', async () => {
    app = await buildApp({ logger: false });

    const response = await app.inject({ method: 'GET', url: '/missing' });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      status: 404,
      message: 'Route not found',
    });
  });
});
