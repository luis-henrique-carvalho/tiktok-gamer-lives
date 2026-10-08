import type { FastifySchema } from 'fastify';

export const simulatorStartDocs: FastifySchema = {
  tags: ['Simulator Ingress'],
  summary: 'Start continuous synthetic traffic generator',
  body: {
    type: 'object',
    required: ['sessionId'],
    properties: {
      sessionId: { type: 'string' },
      eventsPerSecond: { type: 'number', minimum: 1 },
      distribution: {
        type: 'object',
        properties: {
          commentsRatio: { type: 'number', minimum: 0, maximum: 1 },
          giftsRatio: { type: 'number', minimum: 0, maximum: 1 },
        },
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        sessionId: { type: 'string' },
        eventsPerSecond: { type: 'number' },
      },
    },
  },
};

export const simulatorStopDocs: FastifySchema = {
  tags: ['Simulator Ingress'],
  summary: 'Stop running synthetic traffic generator',
  response: {
    200: {
      type: 'object',
      properties: {
        status: { type: 'string' },
      },
    },
  },
};

export const simulatorBurstDocs: FastifySchema = {
  tags: ['Simulator Ingress'],
  summary: 'Trigger high-throughput burst traffic for CA-11 stress testing',
  body: {
    type: 'object',
    required: ['sessionId'],
    properties: {
      sessionId: { type: 'string' },
      totalEvents: { type: 'number', minimum: 1 },
      eventsPerSecond: { type: 'number', minimum: 1 },
      distribution: {
        type: 'object',
        properties: {
          commentsRatio: { type: 'number', minimum: 0, maximum: 1 },
          giftsRatio: { type: 'number', minimum: 0, maximum: 1 },
        },
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        sessionId: { type: 'string' },
        totalGenerated: { type: 'number' },
      },
    },
  },
};

export const simulatorVoteDocs: FastifySchema = {
  tags: ['Simulator Ingress'],
  summary: 'Send manual vote to team A or B',
  body: {
    type: 'object',
    required: ['sessionId', 'team'],
    properties: {
      sessionId: { type: 'string' },
      team: { type: 'string', enum: ['A', 'B'] },
      userId: { type: 'string' },
      userName: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        sessionId: { type: 'string' },
        team: { type: 'string' },
        result: { type: 'object', additionalProperties: true },
      },
    },
  },
};

export const simulatorGiftDocs: FastifySchema = {
  tags: ['Simulator Ingress'],
  summary: 'Send manual gift contribution to team A or B',
  body: {
    type: 'object',
    required: ['sessionId', 'team'],
    properties: {
      sessionId: { type: 'string' },
      team: { type: 'string', enum: ['A', 'B'] },
      units: { type: 'integer', minimum: 1 },
      userId: { type: 'string' },
      userName: { type: 'string' },
      resourceKey: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        sessionId: { type: 'string' },
        team: { type: 'string' },
        units: { type: 'number' },
        result: { type: 'object', additionalProperties: true },
      },
    },
  },
};

export const simulatorClearPendingDocs: FastifySchema = {
  tags: ['Simulator Ingress'],
  summary: 'Clear pending contributions queue for a session',
  body: {
    type: 'object',
    required: ['sessionId'],
    properties: {
      sessionId: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        sessionId: { type: 'string' },
      },
    },
  },
};
