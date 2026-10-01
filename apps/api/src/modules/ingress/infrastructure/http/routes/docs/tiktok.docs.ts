import type { FastifySchema } from 'fastify';

export const tiktokConnectDocs: FastifySchema = {
  tags: ['TikTok Ingress'],
  summary: 'Connect to a TikTok Live stream for real-time event ingestion',
  body: {
    type: 'object',
    required: ['username', 'sessionId'],
    properties: {
      username: { type: 'string' },
      sessionId: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        username: { type: ['string', 'null'] },
        sessionId: { type: ['string', 'null'] },
      },
    },
  },
};

export const tiktokDisconnectDocs: FastifySchema = {
  tags: ['TikTok Ingress'],
  summary: 'Disconnect from active TikTok Live stream',
  response: {
    200: {
      type: 'object',
      properties: {
        status: { type: 'string' },
      },
    },
  },
};

export const tiktokStatusDocs: FastifySchema = {
  tags: ['TikTok Ingress'],
  summary: 'Get current TikTok Live connector status',
  response: {
    200: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        username: { type: ['string', 'null'] },
        sessionId: { type: ['string', 'null'] },
      },
    },
  },
};
