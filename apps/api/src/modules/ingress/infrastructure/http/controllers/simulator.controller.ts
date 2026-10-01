import type { SimulatorCaptureAdapter } from '../../simulator/simulator-capture.adapter.js';
import {
  simulatorStartSchema,
  simulatorBurstSchema,
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
}
