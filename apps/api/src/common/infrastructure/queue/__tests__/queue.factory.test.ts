import { describe, it, expect, afterEach } from 'vitest';
import { Queue, Worker } from 'bullmq';
import { QUEUE_NAMES, DEFAULT_JOB_OPTIONS } from '../queue.constants.js';
import { createQueue, createWorker } from '../queue.factory.js';
import { closeRedisConnection } from '../redis.connection.js';

describe('Queue Factory and Constants', () => {
  const queuesToClose: Queue[] = [];
  const workersToClose: Worker[] = [];

  afterEach(async () => {
    for (const q of queuesToClose) {
      await q.close();
    }
    for (const w of workersToClose) {
      await w.close();
    }
    queuesToClose.length = 0;
    workersToClose.length = 0;
    await closeRedisConnection();
  });

  it('should define queue names correctly', () => {
    expect(QUEUE_NAMES.INGRESS).toBe('ingress-queue');
    expect(QUEUE_NAMES.GAME_COMMANDS).toBe('game-commands-queue');
  });

  it('should create Queue instance with default options', () => {
    const queue = createQueue(QUEUE_NAMES.INGRESS);
    queuesToClose.push(queue);

    expect(queue).toBeInstanceOf(Queue);
    expect(queue.name).toBe('ingress-queue');
    expect(queue.defaultJobOptions.attempts).toBe(DEFAULT_JOB_OPTIONS.attempts);
  });

  it('should create Worker instance with custom processor and concurrency', () => {
    const processor = async () => ({ status: 'ok' });
    const worker = createWorker(QUEUE_NAMES.GAME_COMMANDS, processor, {
      concurrency: 1,
    });
    workersToClose.push(worker);

    expect(worker).toBeInstanceOf(Worker);
    expect(worker.name).toBe('game-commands-queue');
    expect(worker.opts.concurrency).toBe(1);
  });
});
