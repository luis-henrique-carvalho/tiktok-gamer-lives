import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  getRedisConnection,
  closeRedisConnection,
} from '../redis.connection.js';

describe('Redis Connection', () => {
  afterEach(async () => {
    await closeRedisConnection();
  });

  it('should return a singleton Redis connection with maxRetriesPerRequest null', () => {
    const conn1 = getRedisConnection();
    const conn2 = getRedisConnection();

    expect(conn1).toBeDefined();
    expect(conn1).toBe(conn2);
    expect(conn1.options.maxRetriesPerRequest).toBeNull();
  });

  it('should close connection cleanly', async () => {
    const conn = getRedisConnection();
    const quitSpy = vi.spyOn(conn, 'quit').mockResolvedValue('OK');

    await closeRedisConnection();

    expect(quitSpy).toHaveBeenCalled();
  });
});
