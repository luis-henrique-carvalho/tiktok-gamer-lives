import type { Queue } from 'bullmq';
import type { TimerRequest } from '../../contracts/engine.js';

export interface ScheduleTimerInput {
  sessionId: string;
  gameId: string;
  timer: TimerRequest;
}

export class DeclarativeTimerService {
  constructor(private readonly commandQueue: Queue) {}

  async scheduleTimer(input: ScheduleTimerInput): Promise<string> {
    const jobId = `timer_${input.sessionId}_${input.timer.id}_${Date.now()}`;
    const command = {
      type: input.timer.type,
      ...(input.timer.payload ?? {}),
    };

    const job = await this.commandQueue.add(
      'delayed-timer',
      {
        sessionId: input.sessionId,
        gameId: input.gameId,
        command,
        isTimer: true,
        timestamp: Date.now(),
      },
      {
        delay: input.timer.delayMs,
        jobId,
      },
    );

    return job.id ?? jobId;
  }
}
