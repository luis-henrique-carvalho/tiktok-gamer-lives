import { describe, it, expect, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';

describe('Fastify Application (app.ts)', () => {
  let app: FastifyInstance;

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should return 200 and health status on GET /health', async () => {
    app = await buildApp({ logger: false });

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('number');
    expect(typeof body.uptime).toBe('number');
    expect(typeof body.uptimeSeconds).toBe('number');
  });

  it('should handle CORS headers correctly', async () => {
    app = await buildApp({ corsOrigin: 'https://example.com', logger: false });

    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: {
        origin: 'https://example.com',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe(
      'https://example.com',
    );
  });
});
