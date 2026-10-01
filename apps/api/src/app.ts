import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from 'fastify';
import cors, { type FastifyCorsOptions } from '@fastify/cors';
import swagger, { type SwaggerTransformObject } from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { errorHandler } from './common/infrastructure/http/error-handler.js';
import { healthRoutes } from './common/infrastructure/http/routes/health.routes.js';
import { authRoutes } from './modules/auth/infrastructure/http/routes/auth.routes.js';
import { auth } from './modules/auth/infrastructure/better-auth.js';
import { getLoggerConfig } from './common/config/logger.js';
import { loadEnv } from './common/config/env.js';

export interface AppOptions extends FastifyServerOptions {
  corsOrigin?: FastifyCorsOptions['origin'];
}

function createSwaggerTransform(
  authSchema: Awaited<ReturnType<typeof auth.api.generateOpenAPISchema>>,
): SwaggerTransformObject {
  return (args: Parameters<SwaggerTransformObject>[0]) => {
    if (!('openapiObject' in args) || !args.openapiObject) {
      return (
        'swaggerObject' in args ? args.swaggerObject : args
      ) as ReturnType<SwaggerTransformObject>;
    }

    const openapiObject = args.openapiObject;
    const paths: Record<string, unknown> = {
      ...(openapiObject.paths as Record<string, unknown>),
    };

    for (const [path, methods] of Object.entries(authSchema.paths || {})) {
      const fullPath = path.startsWith('/api/auth') ? path : `/api/auth${path}`;
      const taggedMethods: Record<string, unknown> = {};
      for (const [method, def] of Object.entries(
        methods as Record<string, unknown>,
      )) {
        taggedMethods[method] = {
          ...(def as object),
          tags: ['Auth'],
        };
      }
      paths[fullPath] = taggedMethods;
    }

    return {
      ...openapiObject,
      paths,
      components: {
        ...openapiObject.components,
        schemas: {
          ...openapiObject.components?.schemas,
          ...(authSchema.components?.schemas as Record<string, unknown>),
        },
      },
    } as ReturnType<SwaggerTransformObject>;
  };
}

export async function buildApp(
  options: AppOptions = {},
): Promise<FastifyInstance> {
  const env = loadEnv();
  const {
    corsOrigin = '*',
    logger = getLoggerConfig(env),
    ...fastifyOptions
  } = options;

  const app = Fastify({
    logger,
    ...fastifyOptions,
  });

  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler((_request, reply) => {
    return reply.status(404).send({ status: 404, message: 'Route not found' });
  });

  await app.register(cors, {
    origin: corsOrigin,
  });

  const authOpenApiSchema = await auth.api.generateOpenAPISchema();

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'TikTok Gamer Lives API',
        version: '0.1.0',
        description:
          'API de controle e eventos da plataforma de lives interativas. Documentação interativa adicional do Better Auth disponível em [/api/auth/reference](/api/auth/reference).',
      },
    },
    transformObject: createSwaggerTransform(authOpenApiSchema),
  });
  await app.register(swaggerUi, { routePrefix: '/api/docs' });
  await app.register(healthRoutes);
  await app.register(authRoutes);

  return app;
}
