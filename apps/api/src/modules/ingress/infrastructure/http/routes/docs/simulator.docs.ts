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
