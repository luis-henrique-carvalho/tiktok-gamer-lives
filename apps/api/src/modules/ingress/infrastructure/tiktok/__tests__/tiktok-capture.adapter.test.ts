import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { TikTokLiveCaptureAdapter } from '../tiktok-capture.adapter.js';
import type {
  TikTokConnector,
  TikTokConnectorFactory,
  TikTokChatData,
  TikTokGiftData,
  TikTokLikeData,
} from '../tiktok-connector.interface.js';
import type { ProcessInteractionUseCase } from '../../../application/usecases/process-interaction.usecase.js';
import type { SnapshotPublisher } from '../../../../../common/infrastructure/socket/socketio-snapshot-publisher.js';

class MockTikTokConnector extends EventEmitter implements TikTokConnector {
  public isConnected = false;
  public connect = vi.fn(async () => {
    this.isConnected = true;
    this.emit('connected', { state: 'connected' });
    return { isConnected: true };
  });
  public disconnect = vi.fn(async () => {
    this.isConnected = false;
    this.emit('disconnected');
    return {};
  });
  public getState = vi.fn(() => ({
    isConnected: this.isConnected,
  }));
}

describe('TikTokLiveCaptureAdapter', () => {
  let mockConnector: MockTikTokConnector;
  let mockConnectorFactory: TikTokConnectorFactory;
  let mockUseCase: ProcessInteractionUseCase;
  let mockPublisher: SnapshotPublisher;
  let adapter: TikTokLiveCaptureAdapter;

  beforeEach(() => {
    vi.useFakeTimers();
    mockConnector = new MockTikTokConnector();
    mockConnectorFactory = vi.fn(() => mockConnector);
    mockUseCase = {
      execute: vi.fn().mockResolvedValue({ status: 'PROCESSED' }),
    } as unknown as ProcessInteractionUseCase;
    mockPublisher = {
      publishSnapshot: vi.fn(),
      publishAlert: vi.fn(),
      flush: vi.fn(),
      close: vi.fn(),
    };

    adapter = new TikTokLiveCaptureAdapter(
      mockUseCase,
      mockConnectorFactory,
      mockPublisher,
      {
        watchdogTimeoutMs: 15000,
        maxReconnectAttempts: 10,
      },
    );
  });

  afterEach(async () => {
    await adapter.disconnect();
    vi.useRealTimers();
  });

  it('should connect to tiktok live and update status to CONNECTED', async () => {
    expect(adapter.getStatus()).toBe('DISCONNECTED');

    await adapter.connect('streamer123', 'session-abc');

    expect(mockConnectorFactory).toHaveBeenCalledWith('streamer123');
    expect(mockConnector.connect).toHaveBeenCalled();
    expect(adapter.getStatus()).toBe('CONNECTED');
    expect(adapter.getUsername()).toBe('streamer123');
    expect(adapter.getSessionId()).toBe('session-abc');
  });

  it('should normalize chat events and dispatch to ProcessInteractionUseCase', async () => {
    await adapter.connect('streamer123', 'session-abc');

    const chatData: TikTokChatData = {
      uniqueId: 'gamer_alice',
      userId: 'user_123',
      comment: 'A',
      msgId: 'msg_999',
    };

    mockConnector.emit('chat', chatData);

    expect(mockUseCase.execute).toHaveBeenCalledWith({
      sessionId: 'session-abc',
      interaction: expect.objectContaining({
        id: 'msg_999',
        source: 'TIKTOK_LIVE',
        type: 'comment',
        userId: 'user_123',
        userName: 'gamer_alice',
        comment: 'A',
      }),
      idempotencyKey: 'msg_999',
    });
  });

  it('should normalize gift events, dispatch to use case and publish contribution alert', async () => {
    await adapter.connect('streamer123', 'session-abc');

    const giftData: TikTokGiftData = {
      uniqueId: 'supporter_bob',
      userId: 'user_456',
      giftId: 5655,
      giftName: 'Rose',
      diamondCount: 1,
      repeatCount: 5,
      repeatEnd: 1,
      groupId: 'grp_1',
      msgId: 'gift_msg_1',
    };

    mockConnector.emit('gift', giftData);

    expect(mockUseCase.execute).toHaveBeenCalledWith({
      sessionId: 'session-abc',
      interaction: expect.objectContaining({
        id: 'gift_msg_1',
        source: 'TIKTOK_LIVE',
        type: 'gift',
        resourceKey: 'tiktok:gift:5655',
        cumulativeCount: 5,
        sequenceId: 'grp_1',
        userId: 'user_456',
        userName: 'supporter_bob',
      }),
      idempotencyKey: 'gift_msg_1',
    });

    expect(mockPublisher.publishAlert).toHaveBeenCalledWith(
      'session-abc',
      expect.objectContaining({
        userId: 'user_456',
        userName: 'supporter_bob',
        resourceKey: 'tiktok:gift:5655',
        units: 5,
      }),
    );
  });

  it('should normalize like events and dispatch to use case', async () => {
    await adapter.connect('streamer123', 'session-abc');

    const likeData: TikTokLikeData = {
      uniqueId: 'liker_dan',
      userId: 'user_789',
      likeCount: 10,
      msgId: 'like_msg_1',
    };

    mockConnector.emit('like', likeData);

    expect(mockUseCase.execute).toHaveBeenCalledWith({
      sessionId: 'session-abc',
      interaction: expect.objectContaining({
        id: 'like_msg_1',
        source: 'TIKTOK_LIVE',
        type: 'comment',
        comment: 'LIKE',
        userId: 'user_789',
        userName: 'liker_dan',
      }),
      idempotencyKey: 'like_msg_1',
    });
  });

  it('should handle streamEnd and error events from connector', async () => {
    const onStreamEnd = vi.fn();
    const onError = vi.fn();
    adapter.on('tiktok:stream_ended', onStreamEnd);
    adapter.on('tiktok:error', onError);

    await adapter.connect('streamer123', 'session-abc');

    mockConnector.emit('streamEnd');
    expect(onStreamEnd).toHaveBeenCalledWith({
      username: 'streamer123',
      sessionId: 'session-abc',
    });

    const error = new Error('Socket issue');
    mockConnector.emit('error', error);
    expect(onError).toHaveBeenCalledWith(error);
  });

  it('should handle unexpected socket disconnection by triggering reconnection', async () => {
    await adapter.connect('streamer123', 'session-abc');

    mockConnector.emit('disconnected');
    expect(adapter.getStatus()).toBe('RECONNECTING');
  });

  it('should trigger connection warning and reconnect when watchdog expires (15s without packets)', async () => {
    const onWarning = vi.fn();
    adapter.on('tiktok:connection_warning', onWarning);

    await adapter.connect('streamer123', 'session-abc');
    expect(adapter.getStatus()).toBe('CONNECTED');

    // Advance 15 seconds with no events
    vi.advanceTimersByTime(15000);

    expect(onWarning).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session-abc',
        username: 'streamer123',
      }),
    );
    expect(adapter.getStatus()).toBe('RECONNECTING');
  });

  it('should reset watchdog timer when events are received', async () => {
    const onWarning = vi.fn();
    adapter.on('tiktok:connection_warning', onWarning);

    await adapter.connect('streamer123', 'session-abc');

    // Advance 10s
    vi.advanceTimersByTime(10000);
    expect(onWarning).not.toHaveBeenCalled();

    // Event arrives, resetting watchdog
    mockConnector.emit('chat', {
      uniqueId: 'alice',
      comment: 'A',
      msgId: 'm1',
    });

    // Advance another 10s (total 20s elapsed, but only 10s since last event)
    vi.advanceTimersByTime(10000);
    expect(onWarning).not.toHaveBeenCalled();

    // Advance 6s more (> 15s since last event)
    vi.advanceTimersByTime(6000);
    expect(onWarning).toHaveBeenCalledTimes(1);
  });

  it('should perform exponential backoff and emit connection_lost after 10 failed attempts', async () => {
    const onLost = vi.fn();
    adapter.on('tiktok:connection_lost', onLost);

    // Fail all connect attempts from now on
    mockConnector.connect.mockRejectedValue(new Error('Connection failed'));

    await adapter.connect('streamer123', 'session-abc').catch(() => {});

    // Fast-forward through all 10 reconnection backoff steps: 1s, 2s, 4s, 8s, 16s, 30s...
    for (let i = 0; i < 12; i++) {
      await vi.advanceTimersByTimeAsync(35000);
    }

    expect(onLost).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session-abc',
        username: 'streamer123',
        attempts: 10,
      }),
    );
    expect(adapter.getStatus()).toBe('ERROR');
  });

  it('should cleanly disconnect and clear timers', async () => {
    await adapter.connect('streamer123', 'session-abc');
    await adapter.disconnect();

    expect(adapter.getStatus()).toBe('DISCONNECTED');
    expect(mockConnector.disconnect).toHaveBeenCalled();

    // Advance time to verify watchdog does not fire
    const onWarning = vi.fn();
    adapter.on('tiktok:connection_warning', onWarning);
    vi.advanceTimersByTime(30000);
    expect(onWarning).not.toHaveBeenCalled();
  });
});
