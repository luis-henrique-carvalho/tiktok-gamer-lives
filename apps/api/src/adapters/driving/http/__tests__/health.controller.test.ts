import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { checkHealth, healthRoutes } from '../health.controller.js';

describe('Health Controller (Driving Adapter)', () => {
  it('should return valid health status with rounded uptime', () => {
    const status = checkHealth(120.9);
    expect(status.status).toBe('ok');
    expect(status.uptime).toBe(120);
    expect(status.uptimeSeconds).toBe(120);
    expect(status.timestamp).toBeGreaterThan(0);
  });

  it('should register /health route and respond with 200', async () => {
    const fastify = Fastify();
    await fastify.register(healthRoutes);

    const res = await fastify.inject({
      method: 'GET',
      url: '/health',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(typeof body.uptime).toBe('number');
  });
});
