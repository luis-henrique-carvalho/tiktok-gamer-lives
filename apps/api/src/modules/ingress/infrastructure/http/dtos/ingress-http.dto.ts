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

export const manualVoteSchema = z.object({
  sessionId: z.string().min(1, 'sessionId is required'),
  team: z.enum(['A', 'B']),
  userId: z.string().optional(),
  userName: z.string().optional(),
});

export type ManualVoteDto = z.infer<typeof manualVoteSchema>;

export const manualGiftSchema = z.object({
  sessionId: z.string().min(1, 'sessionId is required'),
  team: z.enum(['A', 'B']),
  units: z.number().int().positive().optional(),
  userId: z.string().optional(),
  userName: z.string().optional(),
  resourceKey: z.string().optional(),
});

export type ManualGiftDto = z.infer<typeof manualGiftSchema>;

export const clearPendingSchema = z.object({
  sessionId: z.string().min(1, 'sessionId is required'),
});

export type ClearPendingDto = z.infer<typeof clearPendingSchema>;
