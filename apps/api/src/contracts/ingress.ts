export type InteractionSource = 'TIKTOK_LIVE' | 'SIMULATOR';

export interface BaseInteraction {
  readonly id: string;
  readonly source: InteractionSource;
  readonly userId: string;
  readonly userName: string;
  readonly timestamp: number;
}

export interface CommentInteraction extends BaseInteraction {
  readonly type: 'comment';
  readonly comment: string;
}

export interface GiftInteraction extends BaseInteraction {
  readonly type: 'gift';
  readonly giftId: string;
  readonly giftName?: string;
  readonly diamondCount?: number;
  readonly repeatCount: number;
  readonly groupId?: string;
}

export type NormalizedInteraction = CommentInteraction | GiftInteraction;

export type ConnectionStatus =
  'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'ERROR';
