import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Queue } from 'bullmq';
import { DeclarativeTimerService } from '../declarative-timer.service.js';

describe('DeclarativeTimerService', () => {
  let queue: Queue;
  let timerService: DeclarativeTimerService;

  beforeEach(() => {
    queue = {
      add: vi.fn().mockResolvedValue({ id: 'scheduled-job-123' }),
    } as unknown as Queue;
    timerService = new DeclarativeTimerService(queue);
  });

  it('should schedule delayed job in command queue with specified delay and timer payload', async () => {
    const jobId = await timerService.scheduleTimer({
      sessionId: 'sess-1',
      gameId: 'axb',
      timer: {
        id: 'round-win-delay',
        delayMs: 5000,
        type: 'RESET_ROUND',
        payload: { nextRound: 2 },
      },
    });

    expect(jobId).toBe('scheduled-job-123');
    expect(queue.add).toHaveBeenCalledWith(
      'delayed-timer',
      {
        sessionId: 'sess-1',
        gameId: 'axb',
        command: {
          type: 'RESET_ROUND',
          nextRound: 2,
        },
        isTimer: true,
        timestamp: expect.any(Number),
      },
      expect.objectContaining({
        delay: 5000,
        jobId: expect.stringMatching(/^timer_sess-1_round-win-delay_/),
      }),
    );
  });
});
