import { afterEach, describe, expect, it } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { checkHealth } from '../controllers/health.controller.js';
import { healthRoutes } from '../routes/health.routes.js';

describe('health HTTP route', () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
  });

  it('rounds uptime in the response DTO', () => {
    const status = checkHealth(120.9);
    expect(status).toMatchObject({
      status: 'ok',
      uptime: 120,
      uptimeSeconds: 120,
    });
    expect(status.timestamp).toBeGreaterThan(0);
  });

  it('uses process uptime when none is provided', () => {
    expect(checkHealth().uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('serves the existing /health contract', async () => {
    app = Fastify();
    await app.register(healthRoutes);

    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'ok',
      uptime: expect.any(Number),
      uptimeSeconds: expect.any(Number),
      timestamp: expect.any(Number),
    });
  });
});
