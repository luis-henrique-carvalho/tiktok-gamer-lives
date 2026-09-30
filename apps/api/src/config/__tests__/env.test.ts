import { describe, it, expect } from 'vitest';
import { envSchema, loadEnv } from '../env.js';

describe('Environment Configuration (env.ts)', () => {
  it('should define a valid Zod envSchema', () => {
    expect(envSchema.shape.PORT).toBeDefined();
    expect(envSchema.shape.DATABASE_URL).toBeDefined();
  });

  it('should parse with defaults when no environment variables are provided', () => {
    const env = loadEnv({});

    expect(env.PORT).toBe(3001);
    expect(env.HOST).toBe('0.0.0.0');
    expect(env.NODE_ENV).toBe('development');
    expect(env.DATABASE_URL).toBe(
      'postgresql://postgres:postgres@localhost:5432/tiktok_gamer_lives',
    );
    expect(env.REDIS_URL).toBe('redis://localhost:6379');
    expect(env.CORS_ORIGIN).toBe('*');
  });

  it('should override defaults when custom environment variables are provided', () => {
    const custom = {
      PORT: '4000',
      HOST: '127.0.0.1',
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://user:pass@remote:5432/db',
      REDIS_URL: 'redis://remote:6380',
      CORS_ORIGIN: 'https://example.com',
    };

    const env = loadEnv(custom);

    expect(env.PORT).toBe(4000);
    expect(env.HOST).toBe('127.0.0.1');
    expect(env.NODE_ENV).toBe('production');
    expect(env.DATABASE_URL).toBe('postgresql://user:pass@remote:5432/db');
    expect(env.REDIS_URL).toBe('redis://remote:6380');
    expect(env.CORS_ORIGIN).toBe('https://example.com');
  });

  it('should support test NODE_ENV', () => {
    const env = loadEnv({ NODE_ENV: 'test' });
    expect(env.NODE_ENV).toBe('test');
  });

  it('should throw error when PORT is not a valid number', () => {
    expect(() => loadEnv({ PORT: 'not-a-number' })).toThrow();
  });

  it('should throw error when NODE_ENV is invalid', () => {
    expect(() => loadEnv({ NODE_ENV: 'invalid-env' })).toThrow();
  });

  it('should read process.env by default when no argument is passed', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'test';
      const env = loadEnv();
      expect(env.NODE_ENV).toBe('test');
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });
});
