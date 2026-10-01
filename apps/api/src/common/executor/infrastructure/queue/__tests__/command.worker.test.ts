import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Job } from 'bullmq';
import { createCommandWorker, commandProcessor } from '../command.worker.js';
import type {
  ProcessGameCommandUseCase,
  ProcessGameCommandInput,
  ProcessGameCommandResult,
} from '../../../application/usecases/process-game-command.usecase.js';
import { QUEUE_NAMES } from '../../../../infrastructure/queue/queue.constants.js';

describe('CommandWorker', () => {
  let useCase: ProcessGameCommandUseCase;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should execute ProcessGameCommandUseCase with job data', async () => {
    const mockResult: ProcessGameCommandResult = {
      snapshot: {
        id: 'snap-1',
        sessionId: 'sess-1',
        gameId: 'axb',
        sequence: 1,
        state: {},
        projection: {},
        createdAt: new Date(),
      },
      decision: { nextState: {} },
      projection: {},
    };

    useCase = {
      execute: vi.fn().mockResolvedValue(mockResult),
    } as unknown as ProcessGameCommandUseCase;

    const job = {
      data: {
        sessionId: 'sess-1',
        gameId: 'axb',
        command: { type: 'VOTE', team: 'A' },
        timestamp: 123456,
      } as ProcessGameCommandInput,
    } as Job<ProcessGameCommandInput>;

    const processor = commandProcessor(useCase);
    const result = await processor(job);

    expect(useCase.execute).toHaveBeenCalledWith(job.data);
    expect(result).toEqual(mockResult);
  });

  it('should create worker with strict concurrency 1', () => {
    useCase = {
      execute: vi.fn(),
    } as unknown as ProcessGameCommandUseCase;

    const worker = createCommandWorker(useCase);

    expect(worker.name).toBe(QUEUE_NAMES.GAME_COMMANDS);
    expect(worker.opts.concurrency).toBe(1);
    worker.close();
  });
});
