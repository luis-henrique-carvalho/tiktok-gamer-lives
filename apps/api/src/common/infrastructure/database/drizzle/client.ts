import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import { loadEnv } from '../../../config/env.js';

const env = loadEnv();

export const sqlClient = postgres(env.DATABASE_URL, {
  max: env.NODE_ENV === 'test' ? 5 : 20,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(sqlClient, { schema });
export type Database = typeof db;
