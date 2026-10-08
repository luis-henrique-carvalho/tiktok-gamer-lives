import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SimulatorCaptureAdapter } from '../simulator-capture.adapter.js';
import type { ProcessInteractionUseCase } from '../../../application/usecases/process-interaction.usecase.js';
import type { SnapshotPublisher } from '../../../../../common/infrastructure/socket/socketio-snapshot-publisher.js';

describe('SimulatorCaptureAdapter', () => {
  let mockUseCase: ProcessInteractionUseCase;
  let mockPublisher: SnapshotPublisher;
  let adapter: SimulatorCaptureAdapter;

  beforeEach(() => {
    vi.useFakeTimers();
    mockUseCase = {
      execute: vi.fn().mockResolvedValue({ status: 'PROCESSED' }),
    } as unknown as ProcessInteractionUseCase;

    mockPublisher = {
      publishSnapshot: vi.fn(),
      publishAlert: vi.fn(),
      flush: vi.fn(),
      close: vi.fn(),
    } as unknown as SnapshotPublisher;

    adapter = new SimulatorCaptureAdapter(mockUseCase, mockPublisher);
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

  describe('sendManualVote', () => {
    it('should generate unique userId and default userName when omitted', async () => {
      const result = await adapter.sendManualVote({
        sessionId: 'session-123',
        team: 'A',
      });

      expect(result.success).toBe(true);
      expect(result.interaction).toEqual(
        expect.objectContaining({
          source: 'SIMULATOR',
          type: 'comment',
          comment: 'A',
          userId: expect.stringMatching(/^manual_vote_\d+_[a-z0-9]+$/),
          userName: 'Simulated Voter (Team A)',
        }),
      );

      expect(mockUseCase.execute).toHaveBeenCalledWith({
        sessionId: 'session-123',
        interaction: result.interaction,
        idempotencyKey: result.interaction.id,
      });
    });

    it('should respect custom userId and userName for cooldown testing', async () => {
      const result = await adapter.sendManualVote({
        sessionId: 'session-123',
        team: 'B',
        userId: 'fixed-user-1',
        userName: 'Fixed Tester',
      });

      expect(result.success).toBe(true);
      expect(result.interaction).toEqual(
        expect.objectContaining({
          type: 'comment',
          comment: 'B',
          userId: 'fixed-user-1',
          userName: 'Fixed Tester',
        }),
      );
    });

    it('should fallback to current running sessionId if not provided', async () => {
      adapter.start('running-session-99');
      const result = await adapter.sendManualVote({ team: 'A' });

      expect(result.success).toBe(true);
      expect(mockUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'running-session-99',
        }),
      );
    });
  });

  describe('sendManualGift', () => {
    it('should send default gift (team A -> rose / 5655) and publish alert', async () => {
      const result = await adapter.sendManualGift({
        sessionId: 'session-123',
        team: 'A',
      });

      expect(result.success).toBe(true);
      expect(result.interaction).toEqual(
        expect.objectContaining({
          source: 'SIMULATOR',
          type: 'gift_contribution',
          resourceKey: 'tiktok:gift:5655',
          units: 1,
          userId: expect.stringMatching(/^manual_gift_\d+_[a-z0-9]+$/),
          userName: 'Simulated Gifter (Team A)',
        }),
      );

      expect(mockPublisher.publishAlert).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining({
          userId: result.interaction.userId,
          userName: 'Simulated Gifter (Team A)',
          resourceKey: 'tiktok:gift:5655',
          units: 1,
        }),
      );

      expect(mockUseCase.execute).toHaveBeenCalledWith({
        sessionId: 'session-123',
        interaction: result.interaction,
        idempotencyKey: result.interaction.id,
      });
    });

    it('should send team B gift (perfume / 5879) with custom units, userId, and userName', async () => {
      const result = await adapter.sendManualGift({
        sessionId: 'session-123',
        team: 'B',
        units: 10,
        userId: 'gifter-100',
        userName: 'Mega Fan',
      });

      expect(result.interaction).toEqual(
        expect.objectContaining({
          type: 'gift_contribution',
          resourceKey: 'tiktok:gift:5879',
          units: 10,
          userId: 'gifter-100',
          userName: 'Mega Fan',
        }),
      );

      expect(mockPublisher.publishAlert).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining({
          userId: 'gifter-100',
          userName: 'Mega Fan',
          resourceKey: 'tiktok:gift:5879',
          units: 10,
        }),
      );
    });

    it('should support resourceKey aliases like "rose" and "perfume"', async () => {
      const resultRose = await adapter.sendManualGift({
        sessionId: 'session-123',
        team: 'A',
        resourceKey: 'rose',
      });
      expect(resultRose.interaction.resourceKey).toBe('tiktok:gift:5655');

      const resultPerfume = await adapter.sendManualGift({
        sessionId: 'session-123',
        team: 'B',
        resourceKey: 'perfume',
      });
      expect(resultPerfume.interaction.resourceKey).toBe('tiktok:gift:5879');
    });
  });
});
