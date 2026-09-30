import type { FastifySchema } from 'fastify';

export const healthDocs: FastifySchema = {
  tags: ['Health'],
  summary: 'Check API health',
  description: 'Returns the current API status and process uptime.',
  response: {
    200: {
      description: 'API is running',
      type: 'object',
      required: ['status', 'timestamp', 'uptime', 'uptimeSeconds'],
      properties: {
        status: { type: 'string', enum: ['ok', 'degraded'] },
        timestamp: { type: 'number' },
        uptime: { type: 'number' },
        uptimeSeconds: { type: 'number' },
      },
    },
  },
};
