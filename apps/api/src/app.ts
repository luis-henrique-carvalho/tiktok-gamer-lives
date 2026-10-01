import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from 'fastify';
import cors, { type FastifyCorsOptions } from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { errorHandler } from './common/infrastructure/http/error-handler.js';
import { healthRoutes } from './common/infrastructure/http/routes/health.routes.js';
import { authRoutes } from './modules/auth/infrastructure/http/routes/auth.routes.js';

export interface AppOptions extends FastifyServerOptions {
  corsOrigin?: FastifyCorsOptions['origin'];
}

export async function buildApp(
  options: AppOptions = {},
): Promise<FastifyInstance> {
  const { corsOrigin = '*', ...fastifyOptions } = options;

  const app = Fastify(fastifyOptions);

  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler((_request, reply) => {
    return reply.status(404).send({ status: 404, message: 'Route not found' });
  });

  await app.register(cors, {
    origin: corsOrigin,
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'TikTok Gamer Lives API',
        version: '0.1.0',
      },
    },
  });
  await app.register(swaggerUi, { routePrefix: '/api/docs' });
  await app.register(healthRoutes);
  await app.register(authRoutes);

  return app;
}
