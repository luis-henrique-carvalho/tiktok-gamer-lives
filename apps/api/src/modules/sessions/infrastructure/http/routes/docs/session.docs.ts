import type { FastifySchema } from 'fastify';

const sessionResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    gameId: { type: 'string' },
    operatorId: { type: 'string' },
    status: {
      type: 'string',
      enum: ['CONFIGURING', 'RUNNING', 'PAUSED', 'ENDED'],
    },
    title: { type: 'string' },
    config: { type: 'object', additionalProperties: true },
    startedAt: { type: ['string', 'null'], format: 'date-time' },
    endedAt: { type: ['string', 'null'], format: 'date-time' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const idParamSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', description: 'Unique session ID' },
  },
};

export const createSessionDocs: FastifySchema = {
  tags: ['Sessions'],
  summary: 'Create a new game session',
  body: {
    type: 'object',
    required: ['gameId', 'operatorId', 'title'],
    properties: {
      gameId: { type: 'string' },
      operatorId: { type: 'string' },
      title: { type: 'string' },
      config: { type: 'object' },
    },
  },
  response: {
    201: sessionResponseSchema,
  },
};

export const getSessionDocs: FastifySchema = {
  tags: ['Sessions'],
  summary: 'Get session details by ID',
  params: idParamSchema,
  response: {
    200: sessionResponseSchema,
  },
};

export const startSessionDocs: FastifySchema = {
  tags: ['Sessions'],
  summary: 'Start an existing session',
  params: idParamSchema,
  response: {
    200: sessionResponseSchema,
  },
};

export const pauseSessionDocs: FastifySchema = {
  tags: ['Sessions'],
  summary: 'Pause a running session',
  params: idParamSchema,
  response: {
    200: sessionResponseSchema,
  },
};

export const resumeSessionDocs: FastifySchema = {
  tags: ['Sessions'],
  summary: 'Resume a paused session and drain pending interactions',
  params: idParamSchema,
  response: {
    200: {
      type: 'object',
      properties: {
        session: sessionResponseSchema,
        drainedCount: { type: 'number' },
      },
    },
  },
};

export const endSessionDocs: FastifySchema = {
  tags: ['Sessions'],
  summary: 'End an active session',
  params: idParamSchema,
  response: {
    200: sessionResponseSchema,
  },
};

export const auditSessionDocs: FastifySchema = {
  tags: ['Sessions'],
  summary: 'Export complete session audit data',
  params: idParamSchema,
  response: {
    200: {
      type: 'object',
      properties: {
        session: sessionResponseSchema,
        latestSnapshot: {
          type: ['object', 'null'],
          additionalProperties: true,
        },
        pendingInteractionsCount: { type: 'number' },
        pendingInteractions: {
          type: 'array',
          items: { type: 'object', additionalProperties: true },
        },
      },
    },
  },
};
