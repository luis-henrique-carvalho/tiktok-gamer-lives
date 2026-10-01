import { describe, it, expect } from 'vitest';
import { getLoggerConfig } from '../logger.js';
import type { Env } from '../env.js';

describe('Logger Configuration (logger.ts)', () => {
  const baseEnv: Env = {
    PORT: 3001,
    HOST: '0.0.0.0',
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/db',
    REDIS_URL: 'redis://localhost:6379',
    CORS_ORIGIN: '*',
    BETTER_AUTH_SECRET: 'supersecret-dev-key-change-in-prod-min-32-chars',
    BETTER_AUTH_URL: 'http://localhost:3001',
  };

  it('should return false when NODE_ENV is test', () => {
    const config = getLoggerConfig({ ...baseEnv, NODE_ENV: 'test' });
    expect(config).toBe(false);
  });

  it('should configure pino-pretty and default to debug level in development', () => {
    const config = getLoggerConfig({ ...baseEnv, NODE_ENV: 'development' });
    expect(config).toEqual({
      level: 'debug',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    });
  });

  it('should override log level in development if LOG_LEVEL is provided', () => {
    const config = getLoggerConfig({
      ...baseEnv,
      NODE_ENV: 'development',
      LOG_LEVEL: 'warn',
    });
    expect(config).toMatchObject({
      level: 'warn',
      transport: {
        target: 'pino-pretty',
      },
    });
  });

  it('should configure structured JSON logger and default to info level in production', () => {
    const config = getLoggerConfig({ ...baseEnv, NODE_ENV: 'production' });
    expect(config).toEqual({
      level: 'info',
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    });
  });

  it('should override log level in production if LOG_LEVEL is provided', () => {
    const config = getLoggerConfig({
      ...baseEnv,
      NODE_ENV: 'production',
      LOG_LEVEL: 'error',
    });
    expect(config).toEqual({
      level: 'error',
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    });
  });
});
