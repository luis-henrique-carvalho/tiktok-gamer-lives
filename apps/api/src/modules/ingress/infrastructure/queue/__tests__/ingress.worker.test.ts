import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Job } from 'bullmq';
import { createIngressWorker, ingressProcessor } from '../ingress.worker.js';
import type {
  ProcessInteractionUseCase,
  ProcessInteractionInput,
} from '../../../application/usecases/process-interaction.usecase.js';
import { QUEUE_NAMES } from '../../../../../common/infrastructure/queue/queue.constants.js';

describe('IngressWorker', () => {
  let useCase: ProcessInteractionUseCase;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should process job using ProcessInteractionUseCase', async () => {
    useCase = {
      execute: vi.fn().mockResolvedValue({ status: 'PROCESSED' }),
    } as unknown as ProcessInteractionUseCase;

    const job = {
      data: {
        sessionId: 'sess-1',
        interaction: {
          id: 'int-1',
          source: 'SIMULATOR',
          userId: 'u1',
          userName: 'Alice',
          type: 'comment',
          comment: 'A',
          timestamp: Date.now(),
        },
      } as ProcessInteractionInput,
    } as Job<ProcessInteractionInput>;

    const processor = ingressProcessor(useCase);
    const result = await processor(job);

    expect(useCase.execute).toHaveBeenCalledWith(job.data);
    expect(result).toEqual({ status: 'PROCESSED' });
  });

  it('should create Ingress worker instance configured with correct queue name', () => {
    useCase = {
      execute: vi.fn(),
    } as unknown as ProcessInteractionUseCase;

    const worker = createIngressWorker(useCase);
    expect(worker.name).toBe(QUEUE_NAMES.INGRESS);
    worker.close();
  });
});
