import type { Job, Worker, WorkerOptions } from 'bullmq';
import { QUEUE_NAMES } from '../../../infrastructure/queue/queue.constants.js';
import { createWorker } from '../../../infrastructure/queue/queue.factory.js';
import type {
  ProcessGameCommandUseCase,
  ProcessGameCommandInput,
  ProcessGameCommandResult,
} from '../../application/usecases/process-game-command.usecase.js';

export function commandProcessor(useCase: ProcessGameCommandUseCase) {
  return async (
    job: Job<ProcessGameCommandInput, ProcessGameCommandResult>,
  ): Promise<ProcessGameCommandResult> => {
    return useCase.execute(job.data);
  };
}

export function createCommandWorker(
  useCase: ProcessGameCommandUseCase,
  options?: Omit<WorkerOptions, 'connection'>,
): Worker<ProcessGameCommandInput, ProcessGameCommandResult> {
  return createWorker<ProcessGameCommandInput, ProcessGameCommandResult>(
    QUEUE_NAMES.GAME_COMMANDS,
    commandProcessor(useCase),
    {
      concurrency: 1,
      ...options,
    },
  );
}
