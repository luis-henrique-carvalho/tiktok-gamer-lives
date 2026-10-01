import type { FastifyPluginAsync } from 'fastify';
import type { TikTokController } from '../controllers/tiktok.controller.js';
import {
  tiktokConnectDocs,
  tiktokDisconnectDocs,
  tiktokStatusDocs,
} from './docs/tiktok.docs.js';

export function tiktokRoutes(controller: TikTokController): FastifyPluginAsync {
  return async (app) => {
    app.post(
      '/api/tiktok/connect',
      { schema: tiktokConnectDocs },
      async (req, reply) => {
        const result = await controller.connect(req.body);
        return reply.send(result);
      },
    );

    app.post(
      '/api/tiktok/disconnect',
      { schema: tiktokDisconnectDocs },
      async (_req, reply) => {
        const result = await controller.disconnect();
        return reply.send(result);
      },
    );

    app.get(
      '/api/tiktok/status',
      { schema: tiktokStatusDocs },
      async (_req, reply) => {
        const result = controller.getStatus();
        return reply.send(result);
      },
    );
  };
}
