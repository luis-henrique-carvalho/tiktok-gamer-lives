import {
  Queue,
  Worker,
  type JobsOptions,
  type Processor,
  type WorkerOptions,
} from 'bullmq';
import type { Redis } from 'ioredis';
import { getRedisConnection } from './redis.connection.js';
import { DEFAULT_JOB_OPTIONS } from './queue.constants.js';

export function createQueue<TData = unknown, TResult = unknown>(
  queueName: string,
  connection?: Redis,
  defaultJobOptions?: JobsOptions,
): Queue<TData, TResult> {
  const redis = connection ?? getRedisConnection();
  return new Queue<TData, TResult>(queueName, {
    connection: redis,
    defaultJobOptions: defaultJobOptions ?? DEFAULT_JOB_OPTIONS,
  });
}

export function createWorker<TData = unknown, TResult = unknown>(
  queueName: string,
  processor: Processor<TData, TResult>,
  options?: Omit<WorkerOptions, 'connection'> & { connection?: Redis },
): Worker<TData, TResult> {
  const { connection, ...restOptions } = options ?? {};
  const redis = connection ?? getRedisConnection();
  return new Worker<TData, TResult>(queueName, processor, {
    connection: redis,
    ...restOptions,
  });
}
