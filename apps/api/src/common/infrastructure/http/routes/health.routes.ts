import type { FastifyInstance } from 'fastify';
import { checkHealth } from '../controllers/health.controller.js';
import { healthDocs } from './docs/health.docs.js';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', { schema: healthDocs }, async () => checkHealth());
}
