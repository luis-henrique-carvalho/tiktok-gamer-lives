import type { EventEmitter } from 'node:events';

export interface TikTokChatData {
  uniqueId: string;
  userId?: string;
  comment: string;
  msgId?: string;
  createTime?: string | number;
}

export interface TikTokGiftData {
  uniqueId: string;
  userId?: string;
  giftId: number | string;
  giftName?: string;
  diamondCount?: number;
  repeatCount?: number;
  repeatEnd?: boolean | number;
  groupId?: string;
  msgId?: string;
}

export interface TikTokLikeData {
  uniqueId: string;
  userId?: string;
  likeCount?: number;
  totalLikes?: number;
  msgId?: string;
}

export interface TikTokConnectorState {
  isConnected: boolean;
  roomId?: string;
  roomInfo?: unknown;
}

export interface TikTokConnector extends EventEmitter {
  connect(
    uniqueId?: string,
    options?: Record<string, unknown>,
  ): Promise<TikTokConnectorState | unknown>;
  disconnect(): Promise<unknown>;
  getState(): TikTokConnectorState;
}

export type TikTokConnectorFactory = (username: string) => TikTokConnector;
