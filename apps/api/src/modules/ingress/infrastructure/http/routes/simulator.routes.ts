import type { FastifyPluginAsync } from 'fastify';
import type { SimulatorController } from '../controllers/simulator.controller.js';
import {
  simulatorStartDocs,
  simulatorStopDocs,
  simulatorBurstDocs,
} from './docs/simulator.docs.js';

export function simulatorRoutes(
  controller: SimulatorController,
): FastifyPluginAsync {
  return async (app) => {
    app.post(
      '/api/simulator/start',
      { schema: simulatorStartDocs },
      async (req, reply) => {
        const result = controller.start(req.body);
        return reply.send(result);
      },
    );

    app.post(
      '/api/simulator/stop',
      { schema: simulatorStopDocs },
      async (_req, reply) => {
        const result = controller.stop();
        return reply.send(result);
      },
    );

    app.post(
      '/api/simulator/burst',
      { schema: simulatorBurstDocs },
      async (req, reply) => {
        const result = await controller.burst(req.body);
        return reply.send(result);
      },
    );
  };
}
