import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import type { ProcessInteractionUseCase } from '../../application/usecases/process-interaction.usecase.js';
import type {
  TikTokConnector,
  TikTokConnectorFactory,
  TikTokChatData,
  TikTokGiftData,
  TikTokLikeData,
} from './tiktok-connector.interface.js';
import type {
  CommentInteraction,
  GiftInteraction,
  ConnectionStatus,
} from '../../../../contracts/ingress.js';
import type { SnapshotPublisher } from '../../../../common/infrastructure/socket/socketio-snapshot-publisher.js';

export interface TikTokCaptureAdapterOptions {
  watchdogTimeoutMs?: number;
  maxReconnectAttempts?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
}

export class TikTokLiveCaptureAdapter extends EventEmitter {
  private status: ConnectionStatus = 'DISCONNECTED';
  private username: string | null = null;
  private sessionId: string | null = null;
  private connector: TikTokConnector | null = null;
  private watchdogTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private isExplicitDisconnect = false;

  private readonly watchdogTimeoutMs: number;
  private readonly maxReconnectAttempts: number;
  private readonly baseBackoffMs: number;
  private readonly maxBackoffMs: number;

  constructor(
    private readonly processInteractionUseCase: ProcessInteractionUseCase,
    private readonly connectorFactory?: TikTokConnectorFactory,
    private readonly publisher?: SnapshotPublisher,
    options?: TikTokCaptureAdapterOptions,
  ) {
    super();
    this.watchdogTimeoutMs = options?.watchdogTimeoutMs ?? 15000;
    this.maxReconnectAttempts = options?.maxReconnectAttempts ?? 10;
    this.baseBackoffMs = options?.baseBackoffMs ?? 1000;
    this.maxBackoffMs = options?.maxBackoffMs ?? 30000;
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  getUsername(): string | null {
    return this.username;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  async connect(username: string, sessionId: string): Promise<void> {
    this.username = username;
    this.sessionId = sessionId;
    this.isExplicitDisconnect = false;
    this.reconnectAttempts = 0;
    this.status = 'CONNECTING';

    await this.initiateConnection();
  }

  async disconnect(): Promise<void> {
    this.isExplicitDisconnect = true;
    this.clearWatchdog();
    this.clearReconnectTimer();

    if (this.connector) {
      try {
        await this.connector.disconnect();
      } catch {
        // ignore disconnect error
      }
      this.connector.removeAllListeners();
      this.connector = null;
    }

    this.status = 'DISCONNECTED';
    this.emit('tiktok:disconnected', {
      username: this.username,
      sessionId: this.sessionId,
    });
  }

  private async initiateConnection(): Promise<void> {
    try {
      this.clearWatchdog();
      if (this.connector) {
        this.connector.removeAllListeners();
        this.connector = null;
      }

      this.connector = this.createConnector(this.username!);
      this.bindConnectorEvents(this.connector);

      await this.connector.connect();
      this.status = 'CONNECTED';
      this.reconnectAttempts = 0;
      this.startWatchdog();

      this.emit('tiktok:connected', {
        username: this.username,
        sessionId: this.sessionId,
      });
    } catch (err) {
      this.handleConnectionFailure(err);
    }
  }

  private createConnector(username: string): TikTokConnector {
    if (this.connectorFactory) {
      return this.connectorFactory(username);
    }

    // Default: Dynamic import from tiktok-live-connector
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { WebcastPushConnection } = require('tiktok-live-connector');
    return new WebcastPushConnection(username);
  }

  private bindConnectorEvents(connector: TikTokConnector): void {
    connector.on('chat', (data: TikTokChatData) => {
      this.resetWatchdog();
      this.handleChatEvent(data);
    });

    connector.on('gift', (data: TikTokGiftData) => {
      this.resetWatchdog();
      this.handleGiftEvent(data);
    });

    connector.on('like', (data: TikTokLikeData) => {
      this.resetWatchdog();
      this.handleLikeEvent(data);
    });

    connector.on('streamEnd', () => {
      this.emit('tiktok:stream_ended', {
        username: this.username,
        sessionId: this.sessionId,
      });
    });

    connector.on('disconnected', () => {
      if (!this.isExplicitDisconnect) {
        this.handleConnectionFailure(
          new Error('Underlying socket disconnected'),
        );
      }
    });

    connector.on('error', (err: unknown) => {
      this.emit('tiktok:error', err);
    });
  }

  private handleChatEvent(data: TikTokChatData): void {
    if (!this.sessionId) return;

    const interaction: CommentInteraction = {
      id: data.msgId ?? `chat-${randomUUID()}`,
      source: 'TIKTOK_LIVE',
      userId: data.userId || data.uniqueId,
      userName: data.uniqueId,
      type: 'comment',
      comment: data.comment,
      timestamp: Date.now(),
    };

    this.processInteractionUseCase
      .execute({
        sessionId: this.sessionId,
        interaction,
        idempotencyKey: interaction.id,
      })
      .catch((err) => {
        this.emit('tiktok:error', err);
      });
  }

  private handleGiftEvent(data: TikTokGiftData): void {
    if (!this.sessionId) return;

    const count = data.repeatCount ?? 1;
    const resourceKey = `tiktok:gift:${data.giftId}`;
    const interactionId = data.msgId ?? `gift-${randomUUID()}`;

    const interaction: GiftInteraction = {
      id: interactionId,
      source: 'TIKTOK_LIVE',
      userId: data.userId || data.uniqueId,
      userName: data.uniqueId,
      type: 'gift',
      resourceKey,
      cumulativeCount: count,
      sequenceId: data.groupId ? String(data.groupId) : undefined,
      timestamp: Date.now(),
    };

    if (this.publisher) {
      this.publisher.publishAlert(this.sessionId, {
        id: interactionId,
        userId: interaction.userId,
        userName: interaction.userName,
        resourceKey,
        units: count,
        timestamp: interaction.timestamp,
      });
    }

    this.processInteractionUseCase
      .execute({
        sessionId: this.sessionId,
        interaction,
        idempotencyKey: interaction.id,
      })
      .catch((err) => {
        this.emit('tiktok:error', err);
      });
  }

  private handleLikeEvent(data: TikTokLikeData): void {
    if (!this.sessionId) return;

    const interaction: CommentInteraction = {
      id: data.msgId ?? `like-${randomUUID()}`,
      source: 'TIKTOK_LIVE',
      userId: data.userId || data.uniqueId,
      userName: data.uniqueId,
      type: 'comment',
      comment: 'LIKE',
      timestamp: Date.now(),
    };

    this.processInteractionUseCase
      .execute({
        sessionId: this.sessionId,
        interaction,
        idempotencyKey: interaction.id,
      })
      .catch((err) => {
        this.emit('tiktok:error', err);
      });
  }

  private startWatchdog(): void {
    this.clearWatchdog();
    this.watchdogTimer = setTimeout(() => {
      this.triggerWatchdogTimeout();
    }, this.watchdogTimeoutMs);
  }

  private resetWatchdog(): void {
    if (this.status === 'CONNECTED') {
      this.startWatchdog();
    }
  }

  private clearWatchdog(): void {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private triggerWatchdogTimeout(): void {
    this.emit('tiktok:connection_warning', {
      sessionId: this.sessionId,
      username: this.username,
      reason: 'HEARTBEAT_TIMEOUT_15S',
    });

    this.handleConnectionFailure(new Error('Heartbeat watchdog expired'));
  }

  private handleConnectionFailure(_err: unknown): void {
    this.clearWatchdog();

    if (this.isExplicitDisconnect) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.status = 'ERROR';
      this.emit('tiktok:connection_lost', {
        sessionId: this.sessionId,
        username: this.username,
        attempts: this.reconnectAttempts,
      });
      return;
    }

    this.reconnectAttempts++;
    this.status = 'RECONNECTING';

    const delay = Math.min(
      this.baseBackoffMs * Math.pow(2, this.reconnectAttempts - 1),
      this.maxBackoffMs,
    );

    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      this.initiateConnection();
    }, delay);
  }
}
