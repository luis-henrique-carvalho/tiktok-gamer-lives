import { randomUUID } from 'node:crypto';
import type { ProcessInteractionUseCase } from '../../application/usecases/process-interaction.usecase.js';
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

export class SimulatorCaptureAdapter {
  private continuousTimer: NodeJS.Timeout | null = null;
  private currentSessionId: string | null = null;
  private userIndex = 0;

  constructor(
    private readonly processInteractionUseCase: ProcessInteractionUseCase,
  ) {}

  isRunning(): boolean {
    return this.continuousTimer !== null;
  }

  getCurrentSessionId(): string | null {
    return this.currentSessionId;
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
      const timer = setInterval(async () => {
        if (generated >= totalEvents) {
          clearInterval(timer);
          resolve({ totalGenerated: generated });
          return;
        }

        generated++;
        this.dispatchRandomEvent(sessionId, burstOptions?.distribution);

        if (generated >= totalEvents) {
          clearInterval(timer);
          resolve({ totalGenerated: generated });
        }
      }, intervalMs);
    });
  }

  private dispatchRandomEvent(
    sessionId: string,
    distribution?: InteractionDistribution,
  ): void {
    const interaction = this.generateSyntheticInteraction(distribution);
    this.processInteractionUseCase
      .execute({
        sessionId,
        interaction,
        idempotencyKey: interaction.id,
      })
      .catch(() => {});
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
