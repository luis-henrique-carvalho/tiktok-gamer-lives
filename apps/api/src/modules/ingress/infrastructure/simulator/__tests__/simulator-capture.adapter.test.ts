import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SimulatorCaptureAdapter } from '../simulator-capture.adapter.js';
import type { ProcessInteractionUseCase } from '../../../application/usecases/process-interaction.usecase.js';

describe('SimulatorCaptureAdapter', () => {
  let mockUseCase: ProcessInteractionUseCase;
  let adapter: SimulatorCaptureAdapter;

  beforeEach(() => {
    vi.useFakeTimers();
    mockUseCase = {
      execute: vi.fn().mockResolvedValue({ status: 'PROCESSED' }),
    } as unknown as ProcessInteractionUseCase;

    adapter = new SimulatorCaptureAdapter(mockUseCase);
  });

  afterEach(() => {
    adapter.stop();
    vi.useRealTimers();
  });

  it('should start continuous simulation and generate events at configured rate', () => {
    expect(adapter.isRunning()).toBe(false);

    // 10 events per second => 1 event every 100ms
    adapter.start('session-sim-1', { eventsPerSecond: 10 });
    expect(adapter.isRunning()).toBe(true);

    vi.advanceTimersByTime(250);

    expect(mockUseCase.execute).toHaveBeenCalledTimes(2);
    expect(mockUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session-sim-1',
        interaction: expect.objectContaining({
          source: 'SIMULATOR',
          userId: expect.any(String),
          userName: expect.any(String),
        }),
      }),
    );
  });

  it('should stop simulation and cancel interval timers', () => {
    adapter.start('session-sim-2', { eventsPerSecond: 5 });
    expect(adapter.isRunning()).toBe(true);

    vi.advanceTimersByTime(400);
    expect(mockUseCase.execute).toHaveBeenCalledTimes(2);

    adapter.stop();
    expect(adapter.isRunning()).toBe(false);

    vi.advanceTimersByTime(1000);
    expect(mockUseCase.execute).toHaveBeenCalledTimes(2);
  });

  it('should trigger burst mode CA-11 with high rate of events', async () => {
    const burstPromise = adapter.triggerBurst('session-burst', {
      totalEvents: 200,
      eventsPerSecond: 200,
      distribution: { commentsRatio: 0.8, giftsRatio: 0.2 },
    });

    // Advance 1 second to complete 200 events
    await vi.advanceTimersByTimeAsync(1000);

    const result = await burstPromise;
    expect(result.totalGenerated).toBe(200);
    expect(mockUseCase.execute).toHaveBeenCalledTimes(200);
  });

  it('should generate balanced synthetic interactions according to distribution', async () => {
    let commentCount = 0;
    let giftCount = 0;

    vi.mocked(mockUseCase.execute).mockImplementation(async (input) => {
      if (input.interaction.type === 'comment') commentCount++;
      if (
        input.interaction.type === 'gift' ||
        input.interaction.type === 'gift_contribution'
      )
        giftCount++;
      return { status: 'PROCESSED' };
    });

    const burstPromise = adapter.triggerBurst('session-dist', {
      totalEvents: 100,
      eventsPerSecond: 500,
      distribution: { commentsRatio: 0.7, giftsRatio: 0.3 },
    });

    await vi.advanceTimersByTimeAsync(200);
    await burstPromise;

    expect(commentCount + giftCount).toBe(100);
    expect(commentCount).toBeGreaterThan(50);
    expect(giftCount).toBeGreaterThan(15);
  });
});
