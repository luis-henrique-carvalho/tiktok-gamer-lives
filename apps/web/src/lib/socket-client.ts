import { io, type Socket } from 'socket.io-client';
import type { GameSnapshot, ContributionAlert } from '@/api/types';

export interface RealtimeClientOptions {
  readonly url?: string;
  readonly socketFactory?: (url?: string) => Socket;
}

export type SnapshotListener = (snapshot: GameSnapshot) => void;
export type AlertListener = (alert: ContributionAlert) => void;
export type StatusListener = (connected: boolean) => void;
export type TikTokEventListener = (event: {
  readonly type: string;
  readonly payload: unknown;
}) => void;

export class RealtimeClient {
  private socket: Socket | null = null;
  private readonly socketFactory: (url?: string) => Socket;
  private readonly url?: string;

  private latestSnapshot: GameSnapshot | null = null;
  private hasDirtySnapshot = false;
  private rafHandle: number | null = null;

  private readonly snapshotListeners = new Set<SnapshotListener>();
  private readonly alertListeners = new Set<AlertListener>();
  private readonly statusListeners = new Set<StatusListener>();
  private readonly tiktokListeners = new Set<TikTokEventListener>();

  constructor(options?: RealtimeClientOptions) {
    this.url = options?.url;
    this.socketFactory =
      options?.socketFactory ??
      ((url?: string) =>
        io(url ?? '/', {
          autoConnect: false,
          transports: ['websocket', 'polling'],
        }));
  }

  public connect(): void {
    if (this.socket) {
      if (!this.socket.connected) {
        this.socket.connect();
      }
      return;
    }

    this.socket = this.socketFactory(this.url);
    this.setupListeners();
    this.startRafLoop();
    this.socket.connect();
  }

  public disconnect(): void {
    if (this.rafHandle !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
    this.hasDirtySnapshot = false;
    this.latestSnapshot = null;

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public joinSession(sessionId: string): void {
    if (!this.socket) {
      this.connect();
    }
    this.socket?.emit('join', `session:${sessionId}`);
  }

  public leaveSession(sessionId: string): void {
    this.socket?.emit('leave', `session:${sessionId}`);
  }

  public onSnapshot(listener: SnapshotListener): () => void {
    this.snapshotListeners.add(listener);
    return () => {
      this.snapshotListeners.delete(listener);
    };
  }

  public onAlert(listener: AlertListener): () => void {
    this.alertListeners.add(listener);
    return () => {
      this.alertListeners.delete(listener);
    };
  }

  public onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public onTikTokEvent(listener: TikTokEventListener): () => void {
    this.tiktokListeners.add(listener);
    return () => {
      this.tiktokListeners.delete(listener);
    };
  }

  private setupListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.notifyStatus(true);
    });

    this.socket.on('disconnect', () => {
      this.notifyStatus(false);
    });

    this.socket.on('snapshot', (data: GameSnapshot) => {
      this.latestSnapshot = data;
      this.hasDirtySnapshot = true;
    });

    this.socket.on('contribution_alert', (data: ContributionAlert) => {
      this.notifyAlert(data);
    });

    const tiktokEvents = [
      'tiktok:connected',
      'tiktok:disconnected',
      'tiktok:stream_ended',
      'tiktok:error',
      'tiktok:connection_warning',
      'tiktok:connection_lost',
    ];

    for (const eventName of tiktokEvents) {
      this.socket.on(eventName, (payload: unknown) => {
        this.notifyTikTok({ type: eventName, payload });
      });
    }
  }

  private startRafLoop(): void {
    if (typeof requestAnimationFrame !== 'function') return;

    const frameLoop = () => {
      if (this.hasDirtySnapshot && this.latestSnapshot !== null) {
        const snapshotToEmit = this.latestSnapshot;
        this.hasDirtySnapshot = false;
        this.notifySnapshot(snapshotToEmit);
      }
      this.rafHandle = requestAnimationFrame(frameLoop);
    };

    this.rafHandle = requestAnimationFrame(frameLoop);
  }

  private notifySnapshot(snapshot: GameSnapshot): void {
    for (const listener of this.snapshotListeners) {
      listener(snapshot);
    }
  }

  private notifyAlert(alert: ContributionAlert): void {
    for (const listener of this.alertListeners) {
      listener(alert);
    }
  }

  private notifyStatus(connected: boolean): void {
    for (const listener of this.statusListeners) {
      listener(connected);
    }
  }

  private notifyTikTok(event: {
    readonly type: string;
    readonly payload: unknown;
  }): void {
    for (const listener of this.tiktokListeners) {
      listener(event);
    }
  }
}

export const realtimeClient = new RealtimeClient();
