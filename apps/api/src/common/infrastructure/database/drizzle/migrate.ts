import { migrate } from 'drizzle-orm/postgres-js/migrator';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, sqlClient } from './client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(): Promise<void> {
  const migrationsFolder = path.resolve(__dirname, '../../../../../drizzle');
  await migrate(db, { migrationsFolder });
}

// Allow CLI direct run
if (process.argv[1] === __filename) {
  runMigrations()
    .then(async () => {
      console.info('Migrations completed successfully.');
      await sqlClient.end();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error('Migration failed:', error);
      await sqlClient.end();
      process.exit(1);
    });
}
