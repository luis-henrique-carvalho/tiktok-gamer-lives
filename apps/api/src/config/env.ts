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
  DATABASE_URL: z
    .string()
    .default(
      'postgresql://postgres:postgres@localhost:5432/tiktok_gamer_lives',
    ),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  CORS_ORIGIN: z.string().default('*'),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(override?: Record<string, unknown>): Env {
  return envSchema.parse(override ?? process.env);
}
