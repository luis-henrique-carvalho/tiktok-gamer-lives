import type { Server } from 'socket.io';
import type { GameSnapshot } from '../../../modules/sessions/domain/session.types.js';

export interface ContributionAlert {
  readonly id?: string;
  readonly userId: string;
  readonly userName: string;
  readonly resourceKey: string;
  readonly units: number;
  readonly timestamp: number;
}

export interface SocketIOPublisherOptions {
  throttleMs?: number;
}

export interface SnapshotPublisher {
  publishSnapshot(sessionId: string, snapshot: GameSnapshot | unknown): void;
  publishAlert(sessionId: string, alert: ContributionAlert): void;
  flush(sessionId?: string): void;
  close(): void;
}

export class SocketIOSnapshotPublisher implements SnapshotPublisher {
  private readonly throttleMs: number;
  private readonly buffers = new Map<string, unknown>();
  private readonly timers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly io: Server,
    options?: SocketIOPublisherOptions,
  ) {
    this.throttleMs = options?.throttleMs ?? 50;
  }

  publishSnapshot(sessionId: string, snapshot: GameSnapshot | unknown): void {
    this.buffers.set(sessionId, snapshot);

    if (!this.timers.has(sessionId)) {
      const timer = setTimeout(() => {
        this.emitLatest(sessionId);
      }, this.throttleMs);

      this.timers.set(sessionId, timer);
    }
  }

  publishAlert(sessionId: string, alert: ContributionAlert): void {
    this.io.to(`session:${sessionId}`).emit('contribution_alert', alert);
  }

  flush(sessionId?: string): void {
    if (sessionId) {
      this.clearTimer(sessionId);
      this.emitLatest(sessionId);
      return;
    }

    for (const id of Array.from(this.buffers.keys())) {
      this.clearTimer(id);
      this.emitLatest(id);
    }
  }

  close(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.buffers.clear();
  }

  private emitLatest(sessionId: string): void {
    const snapshot = this.buffers.get(sessionId);
    this.buffers.delete(sessionId);
    this.timers.delete(sessionId);

    if (snapshot !== undefined) {
      this.io.to(`session:${sessionId}`).emit('snapshot', snapshot);
    }
  }

  private clearTimer(sessionId: string): void {
    const timer = this.timers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(sessionId);
    }
  }
}
