import { randomUUID } from 'node:crypto';
import type { ProcessInteractionUseCase } from '../../application/usecases/process-interaction.usecase.js';
import type { SnapshotPublisher } from '../../../../common/infrastructure/socket/socketio-snapshot-publisher.js';
import type {
  CommentInteraction,
  RecognizedGiftContribution,
  GameInteraction,
} from '../../../../contracts/ingress.js';

export interface InteractionDistribution {
  commentsRatio?: number;
  giftsRatio?: number;
}

export interface SimulatorOptions {
  eventsPerSecond?: number;
  distribution?: InteractionDistribution;
}

export interface BurstOptions extends SimulatorOptions {
  totalEvents?: number;
}

export interface ManualVoteParams {
  sessionId?: string;
  team: 'A' | 'B';
  userId?: string;
  userName?: string;
}

export interface ManualGiftParams {
  sessionId?: string;
  team: 'A' | 'B';
  units?: number;
  userId?: string;
  userName?: string;
  resourceKey?: string;
}

export interface ManualActionResult<T = GameInteraction> {
  success: boolean;
  interaction: T;
  status?: string;
  reason?: string;
}

export class SimulatorCaptureAdapter {
  private continuousTimer: NodeJS.Timeout | null = null;
  private currentSessionId: string | null = null;
  private userIndex = 0;

  constructor(
    private readonly processInteractionUseCase: ProcessInteractionUseCase,
    private readonly publisher?: SnapshotPublisher,
  ) {}

  isRunning(): boolean {
    return this.continuousTimer !== null;
  }

  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  async sendManualVote(
    params: ManualVoteParams,
  ): Promise<ManualActionResult<CommentInteraction>> {
    const targetSessionId = params.sessionId || this.currentSessionId || '';
    const userId =
      params.userId && params.userId.trim().length > 0
        ? params.userId.trim()
        : `manual_vote_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const userName =
      params.userName && params.userName.trim().length > 0
        ? params.userName.trim()
        : `Simulated Voter (Team ${params.team})`;

    const interaction: CommentInteraction = {
      id: `sim-manual-vote-${randomUUID()}`,
      source: 'SIMULATOR',
      userId,
      userName,
      type: 'comment',
      comment: params.team,
      timestamp: Date.now(),
    };

    const execResult = await this.processInteractionUseCase.execute({
      sessionId: targetSessionId,
      interaction,
      idempotencyKey: interaction.id,
    });

    return {
      success: true,
      interaction,
      status: execResult.status,
      reason: execResult.reason,
    };
  }

  async sendManualGift(
    params: ManualGiftParams,
  ): Promise<ManualActionResult<RecognizedGiftContribution>> {
    const targetSessionId = params.sessionId || this.currentSessionId || '';
    const userId =
      params.userId && params.userId.trim().length > 0
        ? params.userId.trim()
        : `manual_gift_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const userName =
      params.userName && params.userName.trim().length > 0
        ? params.userName.trim()
        : `Simulated Gifter (Team ${params.team})`;
    const units = Math.max(1, params.units ?? 1);

    let resourceKey: string;
    if (params.resourceKey && params.resourceKey.trim().length > 0) {
      const rawKey = params.resourceKey.trim();
      if (rawKey === 'rose') {
        resourceKey = 'tiktok:gift:5655';
      } else if (rawKey === 'perfume') {
        resourceKey = 'tiktok:gift:5879';
      } else {
        resourceKey = rawKey;
      }
    } else {
      resourceKey =
        params.team === 'A' ? 'tiktok:gift:5655' : 'tiktok:gift:5879';
    }

    const interaction: RecognizedGiftContribution = {
      id: `sim-manual-gift-${randomUUID()}`,
      source: 'SIMULATOR',
      userId,
      userName,
      type: 'gift_contribution',
      resourceKey,
      units,
      timestamp: Date.now(),
    };

    if (this.publisher && targetSessionId) {
      this.publisher.publishAlert(targetSessionId, {
        id: interaction.id,
        userId: interaction.userId,
        userName: interaction.userName,
        resourceKey: interaction.resourceKey,
        units: interaction.units,
        timestamp: interaction.timestamp,
      });
    }

    const execResult = await this.processInteractionUseCase.execute({
      sessionId: targetSessionId,
      interaction,
      idempotencyKey: interaction.id,
    });

    return {
      success: true,
      interaction,
      status: execResult.status,
      reason: execResult.reason,
    };
  }

  async clearPending(sessionId?: string): Promise<{ success: boolean }> {
    const targetSessionId = sessionId || this.currentSessionId || '';
    if (!targetSessionId) {
      return { success: false };
    }
    const success =
      await this.processInteractionUseCase.clearPending(targetSessionId);
    return { success };
  }

  start(sessionId: string, options?: SimulatorOptions): void {
    this.stop();
    this.currentSessionId = sessionId;
    const eps = Math.max(1, options?.eventsPerSecond ?? 5);
    const intervalMs = Math.floor(1000 / eps);

    this.continuousTimer = setInterval(() => {
      this.dispatchRandomEvent(sessionId, options?.distribution);
    }, intervalMs);
  }

  stop(): void {
    if (this.continuousTimer) {
      clearInterval(this.continuousTimer);
      this.continuousTimer = null;
    }
    this.currentSessionId = null;
  }

  async triggerBurst(
    sessionId: string,
    burstOptions?: BurstOptions,
  ): Promise<{ totalGenerated: number }> {
    const totalEvents = burstOptions?.totalEvents ?? 200;
    const eps = Math.max(1, burstOptions?.eventsPerSecond ?? 200);
    const intervalMs = 1000 / eps;

    return new Promise<{ totalGenerated: number }>((resolve) => {
      let generated = 0;
      const tasks: Promise<void>[] = [];

      const timer = setInterval(() => {
        if (generated >= totalEvents) {
          clearInterval(timer);
          void Promise.all(tasks).then(() =>
            resolve({ totalGenerated: generated }),
          );
          return;
        }

        generated++;
        tasks.push(
          this.dispatchRandomEvent(sessionId, burstOptions?.distribution),
        );

        if (generated >= totalEvents) {
          clearInterval(timer);
          void Promise.all(tasks).then(() =>
            resolve({ totalGenerated: generated }),
          );
        }
      }, intervalMs);
    });
  }

  private async dispatchRandomEvent(
    sessionId: string,
    distribution?: InteractionDistribution,
  ): Promise<void> {
    const interaction = this.generateSyntheticInteraction(distribution);

    if (this.publisher && interaction.type === 'gift_contribution') {
      const gift = interaction as RecognizedGiftContribution;
      this.publisher.publishAlert(sessionId, {
        id: gift.id,
        userId: gift.userId,
        userName: gift.userName,
        resourceKey: gift.resourceKey,
        units: gift.units,
        timestamp: gift.timestamp,
      });
    }

    try {
      await this.processInteractionUseCase.execute({
        sessionId,
        interaction,
        idempotencyKey: interaction.id,
      });
    } catch {
      // Best-effort synthetic ingestion
    }
  }

  private generateSyntheticInteraction(
    distribution?: InteractionDistribution,
  ): GameInteraction {
    this.userIndex = (this.userIndex % 50) + 1;
    const userId = `sim_user_${this.userIndex}`;
    const userName = `SimUser${this.userIndex}`;
    const id = `sim-${randomUUID()}`;
    const timestamp = Date.now();

    const commentsRatio = distribution?.commentsRatio ?? 0.8;
    const isComment = Math.random() < commentsRatio;

    if (isComment) {
      const vote = Math.random() < 0.5 ? 'A' : 'B';
      const commentInteraction: CommentInteraction = {
        id,
        source: 'SIMULATOR',
        userId,
        userName,
        type: 'comment',
        comment: vote,
        timestamp,
      };
      return commentInteraction;
    }

    // Gift
    const isTeamA = Math.random() < 0.5;
    const resourceKey = isTeamA ? 'tiktok:gift:5655' : 'tiktok:gift:5879';
    const units = Math.floor(Math.random() * 5) + 1;

    const giftInteraction: RecognizedGiftContribution = {
      id,
      source: 'SIMULATOR',
      userId,
      userName,
      type: 'gift_contribution',
      resourceKey,
      units,
      timestamp,
    };
    return giftInteraction;
  }
}
