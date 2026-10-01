import type { FastifyPluginAsync } from 'fastify';
import type { SessionController } from '../controllers/session.controller.js';
import {
  createSessionDocs,
  getSessionDocs,
  startSessionDocs,
  pauseSessionDocs,
  resumeSessionDocs,
  endSessionDocs,
  auditSessionDocs,
} from './docs/session.docs.js';

export function sessionRoutes(
  controller: SessionController,
): FastifyPluginAsync {
  return async (app) => {
    app.post(
      '/api/sessions',
      { schema: createSessionDocs },
      async (req, reply) => {
        const session = await controller.create(req.body);
        return reply.status(201).send(session);
      },
    );

    app.get<{ Params: { id: string } }>(
      '/api/sessions/:id',
      { schema: getSessionDocs },
      async (req, reply) => {
        const session = await controller.getById(req.params.id);
        return reply.send(session);
      },
    );

    app.post<{ Params: { id: string } }>(
      '/api/sessions/:id/start',
      { schema: startSessionDocs },
      async (req, reply) => {
        const session = await controller.start(req.params.id);
        return reply.send(session);
      },
    );

    app.post<{ Params: { id: string } }>(
      '/api/sessions/:id/pause',
      { schema: pauseSessionDocs },
      async (req, reply) => {
        const session = await controller.pause(req.params.id);
        return reply.send(session);
      },
    );

    app.post<{ Params: { id: string } }>(
      '/api/sessions/:id/resume',
      { schema: resumeSessionDocs },
      async (req, reply) => {
        const result = await controller.resume(req.params.id);
        return reply.send(result);
      },
    );

    app.post<{ Params: { id: string } }>(
      '/api/sessions/:id/end',
      { schema: endSessionDocs },
      async (req, reply) => {
        const session = await controller.end(req.params.id);
        return reply.send(session);
      },
    );

    app.get<{ Params: { id: string } }>(
      '/api/sessions/:id/audit',
      { schema: auditSessionDocs },
      async (req, reply) => {
        const auditData = await controller.audit(req.params.id);
        return reply.send(auditData);
      },
    );
  };
}
