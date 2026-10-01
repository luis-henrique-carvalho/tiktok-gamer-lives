import { z } from 'zod';

export const simulatorStartSchema = z.object({
  sessionId: z.string().min(1, 'sessionId is required'),
  eventsPerSecond: z.number().positive().optional(),
  distribution: z
    .object({
      commentsRatio: z.number().min(0).max(1).optional(),
      giftsRatio: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

export type SimulatorStartDto = z.infer<typeof simulatorStartSchema>;

export const simulatorBurstSchema = z.object({
  sessionId: z.string().min(1, 'sessionId is required'),
  totalEvents: z.number().int().positive().optional(),
  eventsPerSecond: z.number().positive().optional(),
  distribution: z
    .object({
      commentsRatio: z.number().min(0).max(1).optional(),
      giftsRatio: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

export type SimulatorBurstDto = z.infer<typeof simulatorBurstSchema>;

export const tiktokConnectSchema = z.object({
  username: z.string().min(1, 'username is required'),
  sessionId: z.string().min(1, 'sessionId is required'),
});

export type TikTokConnectDto = z.infer<typeof tiktokConnectSchema>;
