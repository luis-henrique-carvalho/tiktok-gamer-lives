import type { SimulatorCaptureAdapter } from '../../simulator/simulator-capture.adapter.js';
import {
  simulatorStartSchema,
  simulatorBurstSchema,
  manualVoteSchema,
  manualGiftSchema,
  clearPendingSchema,
} from '../dtos/ingress-http.dto.js';

export class SimulatorController {
  constructor(private readonly simulatorAdapter: SimulatorCaptureAdapter) {}

  start(body: unknown) {
    const input = simulatorStartSchema.parse(body);
    this.simulatorAdapter.start(input.sessionId, {
      eventsPerSecond: input.eventsPerSecond,
      distribution: input.distribution,
    });

    return {
      status: 'RUNNING',
      sessionId: input.sessionId,
      eventsPerSecond: input.eventsPerSecond ?? 5,
    };
  }

  stop() {
    this.simulatorAdapter.stop();
    return {
      status: 'STOPPED',
    };
  }

  async burst(body: unknown) {
    const input = simulatorBurstSchema.parse(body);
    const result = await this.simulatorAdapter.triggerBurst(input.sessionId, {
      totalEvents: input.totalEvents,
      eventsPerSecond: input.eventsPerSecond,
      distribution: input.distribution,
    });

    return {
      status: 'COMPLETED',
      sessionId: input.sessionId,
      totalGenerated: result.totalGenerated,
    };
  }

  async vote(body: unknown) {
    const input = manualVoteSchema.parse(body);
    const result = await this.simulatorAdapter.sendManualVote({
      sessionId: input.sessionId,
      team: input.team,
      userId: input.userId,
      userName: input.userName,
    });

    return {
      success: true,
      sessionId: input.sessionId,
      team: input.team,
      result,
    };
  }

  async gift(body: unknown) {
    const input = manualGiftSchema.parse(body);
    const result = await this.simulatorAdapter.sendManualGift({
      sessionId: input.sessionId,
      team: input.team,
      units: input.units,
      userId: input.userId,
      userName: input.userName,
      resourceKey: input.resourceKey,
    });

    return {
      success: true,
      sessionId: input.sessionId,
      team: input.team,
      units: input.units ?? 1,
      result,
    };
  }

  async clearPending(body: unknown) {
    const input = clearPendingSchema.parse(body);
    const result = await this.simulatorAdapter.clearPending(input.sessionId);

    return {
      success: result.success,
      sessionId: input.sessionId,
    };
  }
}
