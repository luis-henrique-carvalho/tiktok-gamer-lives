import { loadEnv } from './common/config/env.js';
import { buildApp } from './app.js';
import { closeRedisConnection } from './common/infrastructure/queue/redis.connection.js';
import { sqlClient } from './common/infrastructure/database/drizzle/client.js';

export async function main(): Promise<void> {
  const env = loadEnv();
  const app = await buildApp({
    logger: env.NODE_ENV !== 'test',
    corsOrigin: env.CORS_ORIGIN,
  });

  const stop = async (signal: string) => {
    app.log.info(`Received ${signal}. Gracefully shutting down...`);
    try {
      await app.close();
      await closeRedisConnection();
      await sqlClient.end();
      process.exit(0);
    } catch (err) {
      app.log.error(err, 'Error during graceful shutdown');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => {
    void stop('SIGINT');
  });
  process.on('SIGTERM', () => {
    void stop('SIGTERM');
  });

  try {
    const address = await app.listen({
      port: env.PORT,
      host: env.HOST,
    });
    console.info(`[TikTok Gamer Lives API] Server listening at ${address}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  void main();
}
