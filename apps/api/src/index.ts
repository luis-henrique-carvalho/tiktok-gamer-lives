import { checkHealth } from './modules/health.js';

export function main(): void {
  const health = checkHealth();
  console.info(
    `[TikTok Gamer Lives API] Initialized with status: ${health.status}`,
  );
}

if (process.env.NODE_ENV !== 'test') {
  main();
}
