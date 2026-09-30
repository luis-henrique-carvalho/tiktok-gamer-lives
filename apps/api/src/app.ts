import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from 'fastify';
import cors, { type FastifyCorsOptions } from '@fastify/cors';
import { healthRoutes } from './adapters/driving/http/health.controller.js';

export interface AppOptions extends FastifyServerOptions {
  corsOrigin?: FastifyCorsOptions['origin'];
}

export async function buildApp(
  options: AppOptions = {},
): Promise<FastifyInstance> {
  const { corsOrigin = '*', ...fastifyOptions } = options;

  const app = Fastify(fastifyOptions);

  await app.register(cors, {
    origin: corsOrigin,
  });

  await app.register(healthRoutes);

  return app;
}
