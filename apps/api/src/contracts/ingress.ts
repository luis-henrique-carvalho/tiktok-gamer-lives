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
  /** Opaque origin-qualified catalog key, for example `tiktok:gift:5655`. */
  readonly resourceKey: string;
  /** Cumulative count from the origin; recognized by the core before game mapping. */
  readonly cumulativeCount: number;
  /** Stable identity of this gift sequence, when supplied by the origin. */
  readonly sequenceId?: string;
}

export type NormalizedInteraction = CommentInteraction | GiftInteraction;

/** Input to a game mapper after the core has deduplicated and recognized gift units. */
export interface RecognizedGiftContribution extends BaseInteraction {
  readonly type: 'gift_contribution';
  readonly resourceKey: string;
  readonly units: number;
}

export type GameInteraction = CommentInteraction | RecognizedGiftContribution;

export type ConnectionStatus =
  'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'ERROR';
