import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { openAPI } from 'better-auth/plugins';
import { db } from '../../../common/infrastructure/database/drizzle/client.js';
import * as schema from '../../../common/infrastructure/database/drizzle/schema.js';
import { loadEnv } from '../../../common/config/env.js';

const env = loadEnv();

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
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
  plugins: [openAPI()],
});

export type Auth = typeof auth;
