import { z } from 'zod';

export const AxBTeamIdSchema = z.enum(['A', 'B']);

export const AxBTeamConfigSchema = z.object({
  id: AxBTeamIdSchema,
  name: z
    .string()
    .trim()
    .min(1, 'Nome do time não pode ser vazio')
    .max(24, 'Nome do time deve ter no máximo 24 caracteres'),
  color: z.string().trim().min(1, 'Cor do time não pode ser vazia'),
});

export const AxBGiftRuleSchema = z.object({
  resourceKey: z.string().min(1, 'resourceKey não pode ser vazio'),
  targetTeam: AxBTeamIdSchema,
  pointsPerUnit: z
    .number()
    .int()
    .positive('Pontos por unidade devem ser positivos'),
});

export const AxBConfigSchema = z.object({
  teamA: AxBTeamConfigSchema.refine((team) => team.id === 'A', {
    message: 'Time A deve ter id "A"',
  }),
  teamB: AxBTeamConfigSchema.refine((team) => team.id === 'B', {
    message: 'Time B deve ter id "B"',
  }),
  scoreGoal: z
    .number()
    .int('scoreGoal deve ser um número inteiro')
    .min(100, 'scoreGoal deve ser no mínimo 100')
    .max(100_000, 'scoreGoal deve ser no máximo 100.000'),
  commentCooldownMs: z
    .number()
    .int()
    .nonnegative('commentCooldownMs não pode ser negativo'),
  intervalDurationMs: z
    .number()
    .int()
    .nonnegative('intervalDurationMs não pode ser negativo'),
  giftRules: z
    .array(AxBGiftRuleSchema)
    .max(6, 'Tabela de presentes permite no máximo 6 regras'),
});

export type AxBConfigInput = z.infer<typeof AxBConfigSchema>;
