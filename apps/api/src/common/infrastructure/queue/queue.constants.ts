import type { JobsOptions } from 'bullmq';

export const QUEUE_NAMES = {
  INGRESS: 'ingress-queue',
  GAME_COMMANDS: 'game-commands-queue',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const DEFAULT_JOB_OPTIONS: Readonly<JobsOptions> = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
  removeOnComplete: {
    count: 1000,
  },
  removeOnFail: {
    count: 5000,
  },
};
