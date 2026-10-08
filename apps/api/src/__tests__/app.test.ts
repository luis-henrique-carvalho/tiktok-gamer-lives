import { describe, it, expect, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';

describe('Fastify Application (app.ts)', () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
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
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('should handle CORS preflight OPTIONS with credentials', async () => {
    app = await buildApp({ corsOrigin: '*', logger: false });

    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/auth/sign-in/email',
      headers: {
        origin: 'http://localhost:5180',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(
      'http://localhost:5180',
    );
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('serves OpenAPI documentation with all module routes registered', async () => {
    app = await buildApp({ logger: false });

    const response = await app.inject({ method: 'GET', url: '/api/docs/json' });
    expect(response.statusCode).toBe(200);
    const json = response.json();

    expect(json.openapi).toBeDefined();
    const paths = Object.keys(json.paths);
    expect(paths).toContain('/health');
    expect(paths).toContain('/api/sessions');
    expect(paths).toContain('/api/sessions/{id}');
    expect(paths).toContain('/api/sessions/{id}/start');
    expect(paths).toContain('/api/sessions/{id}/pause');
    expect(paths).toContain('/api/sessions/{id}/resume');
    expect(paths).toContain('/api/sessions/{id}/end');
    expect(paths).toContain('/api/sessions/{id}/audit');
    expect(paths).toContain('/api/simulator/start');
    expect(paths).toContain('/api/simulator/stop');
    expect(paths).toContain('/api/simulator/burst');
    expect(paths).toContain('/api/tiktok/connect');
    expect(paths).toContain('/api/tiktok/disconnect');
    expect(paths).toContain('/api/tiktok/status');

    const ui = await app.inject({ method: 'GET', url: '/api/docs/' });
    expect(ui.statusCode).toBe(200);
    expect(ui.headers['content-type']).toContain('text/html');
  });

  it('should return 404 for unknown route', async () => {
    app = await buildApp({ logger: false });

    const response = await app.inject({
      method: 'GET',
      url: '/non-existent-path',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      status: 404,
      message: 'Route not found',
    });
  });
});
