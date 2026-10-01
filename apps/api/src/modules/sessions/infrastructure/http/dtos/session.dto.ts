import { z } from 'zod';

export const createSessionSchema = z.object({
  gameId: z.string().min(1, 'gameId is required'),
  operatorId: z.string().min(1, 'operatorId is required'),
  title: z.string().min(1, 'title is required'),
  config: z.record(z.unknown()).optional(),
});

export type CreateSessionDto = z.infer<typeof createSessionSchema>;

export const sessionIdParamSchema = z.object({
  id: z.string().min(1, 'Session ID is required'),
});

export type SessionIdParamDto = z.infer<typeof sessionIdParamSchema>;
