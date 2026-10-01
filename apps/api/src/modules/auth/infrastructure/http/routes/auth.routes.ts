import type { FastifyPluginAsync } from 'fastify';
import { auth } from '../../better-auth.js';
import { authOpenApiDoc } from './docs/auth.doc.js';

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.all('/api/auth/*', { schema: authOpenApiDoc }, async (request, reply) => {
    const protocol = request.protocol || 'http';
    const hostname = request.hostname || 'localhost';
    const url = new URL(request.url, `${protocol}://${hostname}`);

    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          for (const v of value) {
            headers.append(key, v);
          }
        } else {
          headers.append(key, value);
        }
      }
    }

    const reqMethod = request.method.toUpperCase();
    const reqInit: RequestInit = {
      method: reqMethod,
      headers,
    };

    if (
      reqMethod !== 'GET' &&
      reqMethod !== 'HEAD' &&
      request.body !== undefined &&
      request.body !== null
    ) {
      reqInit.body =
        typeof request.body === 'string'
          ? request.body
          : JSON.stringify(request.body);
      if (!headers.has('content-type')) {
        headers.set('content-type', 'application/json');
      }
    }

    const standardRequest = new Request(url.toString(), reqInit);
    const response = await auth.handler(standardRequest);

    reply.status(response.status);

    response.headers.forEach((value, key) => {
      reply.header(key, value);
    });

    // Handle set-cookie specifically if available
    if (typeof response.headers.getSetCookie === 'function') {
      const cookies = response.headers.getSetCookie();
      if (cookies.length > 0) {
        reply.header('set-cookie', cookies);
      }
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await response.json();
      return reply.send(json);
    }

    const text = await response.text();
    return reply.send(text);
  });
};
