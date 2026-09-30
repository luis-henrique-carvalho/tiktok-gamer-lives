import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from 'fastify';
import cors, { type FastifyCorsOptions } from '@fastify/cors';
import { checkHealth } from './modules/health.js';

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

  app.get('/health', async () => {
    return checkHealth();
  });

  return app;
}
