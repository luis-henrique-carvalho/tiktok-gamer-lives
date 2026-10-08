import type { FastifyPluginAsync } from 'fastify';
import type { SimulatorController } from '../controllers/simulator.controller.js';
import {
  simulatorStartDocs,
  simulatorStopDocs,
  simulatorBurstDocs,
  simulatorVoteDocs,
  simulatorGiftDocs,
  simulatorClearPendingDocs,
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

    app.post(
      '/api/simulator/vote',
      { schema: simulatorVoteDocs },
      async (req, reply) => {
        const result = await controller.vote(req.body);
        return reply.send(result);
      },
    );

    app.post(
      '/api/simulator/gift',
      { schema: simulatorGiftDocs },
      async (req, reply) => {
        const result = await controller.gift(req.body);
        return reply.send(result);
      },
    );

    app.post(
      '/api/simulator/clear-pending',
      { schema: simulatorClearPendingDocs },
      async (req, reply) => {
        const result = await controller.clearPending(req.body);
        return reply.send(result);
      },
    );
  };
}
