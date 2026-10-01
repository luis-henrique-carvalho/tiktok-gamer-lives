import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Server } from 'socket.io';
import {
  SocketIOSnapshotPublisher,
  type ContributionAlert,
} from '../socketio-snapshot-publisher.js';
import type { GameSnapshot } from '../../../../modules/sessions/domain/session.types.js';

describe('SocketIOSnapshotPublisher', () => {
  let mockEmit: ReturnType<typeof vi.fn>;
  let mockTo: ReturnType<typeof vi.fn>;
  let mockIo: Server;
  let publisher: SocketIOSnapshotPublisher;

  beforeEach(() => {
    vi.useFakeTimers();
    mockEmit = vi.fn();
    mockTo = vi.fn().mockReturnValue({ emit: mockEmit });
    mockIo = {
      to: mockTo,
    } as unknown as Server;

    publisher = new SocketIOSnapshotPublisher(mockIo, { throttleMs: 50 });
  });

  afterEach(() => {
    publisher.close();
    vi.useRealTimers();
  });

  it('should coalesce high-frequency snapshots in 50ms window and emit latest-wins', () => {
    const sessionId = 'session-123';

    for (let i = 1; i <= 10; i++) {
      const snapshot: GameSnapshot = {
        id: `snap-${i}`,
        sessionId,
        gameId: 'axb',
        sequence: i,
        state: { score: i * 10 },
        projection: { totalScore: i * 10 },
        createdAt: new Date(),
      };
      publisher.publishSnapshot(sessionId, snapshot);
      // Advance by 2ms between snapshots (total 20ms < 50ms)
      vi.advanceTimersByTime(2);
    }

    // Before 50ms elapsed, no emission yet
    expect(mockTo).not.toHaveBeenCalled();
    expect(mockEmit).not.toHaveBeenCalled();

    // Advance to complete 50ms window
    vi.advanceTimersByTime(35);

    expect(mockTo).toHaveBeenCalledTimes(1);
    expect(mockTo).toHaveBeenCalledWith('session:session-123');
    expect(mockEmit).toHaveBeenCalledTimes(1);
    expect(mockEmit).toHaveBeenCalledWith(
      'snapshot',
      expect.objectContaining({
        sequence: 10,
        state: { score: 100 },
      }),
    );
  });

  it('should emit alert immediately without coalescing or delay', () => {
    const sessionId = 'session-123';
    const alert: ContributionAlert = {
      userId: 'user-1',
      userName: 'Alice',
      resourceKey: 'tiktok:gift:5655',
      units: 5,
      timestamp: Date.now(),
    };

    publisher.publishAlert(sessionId, alert);

    expect(mockTo).toHaveBeenCalledTimes(1);
    expect(mockTo).toHaveBeenCalledWith('session:session-123');
    expect(mockEmit).toHaveBeenCalledTimes(1);
    expect(mockEmit).toHaveBeenCalledWith('contribution_alert', alert);
  });

  it('should handle multiple sessions independently with their own windows', () => {
    const session1 = 'session-1';
    const session2 = 'session-2';

    publisher.publishSnapshot(session1, {
      id: 's1-1',
      sessionId: session1,
      gameId: 'axb',
      sequence: 1,
      state: {},
      projection: {},
      createdAt: new Date(),
    });

    vi.advanceTimersByTime(30);

    publisher.publishSnapshot(session2, {
      id: 's2-1',
      sessionId: session2,
      gameId: 'axb',
      sequence: 1,
      state: {},
      projection: {},
      createdAt: new Date(),
    });

    // Advance 25ms: session 1 reaches 55ms (fired), session 2 at 25ms (pending)
    vi.advanceTimersByTime(25);

    expect(mockTo).toHaveBeenCalledWith('session:session-1');
    expect(mockTo).not.toHaveBeenCalledWith('session:session-2');

    // Advance another 30ms: session 2 reaches 55ms (fired)
    vi.advanceTimersByTime(30);
    expect(mockTo).toHaveBeenCalledWith('session:session-2');
  });

  it('should immediately flush pending snapshots on flush(sessionId)', () => {
    const sessionId = 'session-flush';
    publisher.publishSnapshot(sessionId, {
      id: 'snap-flush',
      sessionId,
      gameId: 'axb',
      sequence: 42,
      state: {},
      projection: {},
      createdAt: new Date(),
    });

    expect(mockTo).not.toHaveBeenCalled();

    publisher.flush(sessionId);

    expect(mockTo).toHaveBeenCalledWith('session:session-flush');
    expect(mockEmit).toHaveBeenCalledWith(
      'snapshot',
      expect.objectContaining({ sequence: 42 }),
    );

    // Advancing timers should not cause duplicate emission
    vi.advanceTimersByTime(100);
    expect(mockEmit).toHaveBeenCalledTimes(1);
  });

  it('should immediately flush all pending snapshots when flush() is called without argument', () => {
    publisher.publishSnapshot('s1', {
      id: 'snap-1',
      sessionId: 's1',
      gameId: 'axb',
      sequence: 10,
      state: {},
      projection: {},
      createdAt: new Date(),
    });

    publisher.publishSnapshot('s2', {
      id: 'snap-2',
      sessionId: 's2',
      gameId: 'axb',
      sequence: 20,
      state: {},
      projection: {},
      createdAt: new Date(),
    });

    publisher.flush();

    expect(mockTo).toHaveBeenCalledWith('session:s1');
    expect(mockTo).toHaveBeenCalledWith('session:s2');
  });

  it('should cancel all pending timers on close()', () => {
    const sessionId = 'session-close';
    publisher.publishSnapshot(sessionId, {
      id: 'snap-close',
      sessionId,
      gameId: 'axb',
      sequence: 99,
      state: {},
      projection: {},
      createdAt: new Date(),
    });

    publisher.close();

    vi.advanceTimersByTime(100);
    expect(mockTo).not.toHaveBeenCalled();
    expect(mockEmit).not.toHaveBeenCalled();
  });
});
