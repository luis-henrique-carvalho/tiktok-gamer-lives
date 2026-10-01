import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env if present
dotenv.config();

export const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'])
    .optional(),
  DATABASE_URL: z
    .string()
    .default(
      'postgresql://postgres:postgres@localhost:5432/tiktok_gamer_lives',
    ),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  CORS_ORIGIN: z.string().default('*'),
  BETTER_AUTH_SECRET: z
    .string()
    .default('supersecret-dev-key-change-in-prod-min-32-chars'),
  BETTER_AUTH_URL: z.string().default('http://localhost:3001'),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(override?: Record<string, unknown>): Env {
  return envSchema.parse(override ?? process.env);
}
