import type { Job, Worker, WorkerOptions } from 'bullmq';
import { QUEUE_NAMES } from '../../../../common/infrastructure/queue/queue.constants.js';
import { createWorker } from '../../../../common/infrastructure/queue/queue.factory.js';
import type {
  ProcessInteractionUseCase,
  ProcessInteractionInput,
  ProcessInteractionResult,
} from '../../application/usecases/process-interaction.usecase.js';

export function ingressProcessor(useCase: ProcessInteractionUseCase) {
  return async (
    job: Job<ProcessInteractionInput, ProcessInteractionResult>,
  ): Promise<ProcessInteractionResult> => {
    return useCase.execute(job.data);
  };
}

export function createIngressWorker(
  useCase: ProcessInteractionUseCase,
  options?: Omit<WorkerOptions, 'connection'>,
): Worker<ProcessInteractionInput, ProcessInteractionResult> {
  return createWorker<ProcessInteractionInput, ProcessInteractionResult>(
    QUEUE_NAMES.INGRESS,
    ingressProcessor(useCase),
    options,
  );
}
