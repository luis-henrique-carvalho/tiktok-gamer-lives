import type { GameInputMapper } from '../../contracts/engine.js';
import type { NormalizedInteraction } from '../../contracts/ingress.js';
import type { AxBCommand, AxBConfig } from './types.js';

export class AxBInputMapper implements GameInputMapper<AxBConfig, AxBCommand> {
  mapInteraction(
    interaction: NormalizedInteraction,
    config: AxBConfig,
  ): AxBCommand | null {
    if (interaction.type === 'comment') {
      const normalizedComment = interaction.comment.trim().toUpperCase();

      if (normalizedComment === 'A') {
        return {
          type: 'VOTE',
          team: 'A',
          userId: interaction.userId,
          timestamp: interaction.timestamp,
        };
      }

      if (normalizedComment === 'B') {
        return {
          type: 'VOTE',
          team: 'B',
          userId: interaction.userId,
          timestamp: interaction.timestamp,
        };
      }

      return null;
    }

    if (interaction.type === 'gift') {
      const rule = config.giftRules.find(
        (r) => r.giftId === interaction.giftId,
      );
      if (!rule) {
        return null;
      }

      const comboKey = interaction.groupId
        ? `${interaction.userId}:${interaction.giftId}:${interaction.groupId}`
        : `${interaction.userId}:${interaction.giftId}`;

      return {
        type: 'GIFT',
        team: rule.targetTeam,
        pointsPerUnit: rule.pointsPerUnit,
        giftId: interaction.giftId,
        userId: interaction.userId,
        count: interaction.repeatCount,
        comboKey,
        timestamp: interaction.timestamp,
      };
    }

    return null;
  }
}
