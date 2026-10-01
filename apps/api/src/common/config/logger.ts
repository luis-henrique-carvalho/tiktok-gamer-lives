import type { FastifyServerOptions } from 'fastify';
import type { Env } from './env.js';

export function getLoggerConfig(env: Env): FastifyServerOptions['logger'] {
  if (env.NODE_ENV === 'test') {
    return false;
  }

  const redact = ['req.headers.authorization', 'req.headers.cookie'];

  if (env.NODE_ENV === 'development') {
    return {
      level: env.LOG_LEVEL ?? 'debug',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
      redact,
    };
  }

  return {
    level: env.LOG_LEVEL ?? 'info',
    redact,
  };
}
