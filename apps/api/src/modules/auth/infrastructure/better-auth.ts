import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../../../common/infrastructure/database/drizzle/client.js';
import * as schema from '../../../common/infrastructure/database/drizzle/schema.js';
import { loadEnv } from '../../../common/config/env.js';

const env = loadEnv();

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [
    'http://localhost:5176',
    'http://localhost:5180',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3010',
    'http://127.0.0.1:5176',
    'http://127.0.0.1:5180',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3010',
    ...(env.CORS_ORIGIN && env.CORS_ORIGIN !== '*'
      ? env.CORS_ORIGIN.split(',').map((o) => o.trim())
      : []),
  ],
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
});

export type Auth = typeof auth;
