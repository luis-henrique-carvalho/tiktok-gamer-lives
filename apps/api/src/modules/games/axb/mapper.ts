import type { GameInputMapper } from '../../../contracts/engine.js';
import type { GameInteraction } from '../../../contracts/ingress.js';
import type { AxBCommand, AxBConfig } from './types.js';

export class AxBInputMapper implements GameInputMapper<AxBConfig, AxBCommand> {
  mapInteraction(
    interaction: GameInteraction,
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

    if (interaction.type === 'gift_contribution') {
      const rule = config.giftRules.find(
        (r) => r.resourceKey === interaction.resourceKey,
      );
      if (!rule) {
        return null;
      }

      return {
        type: 'GIFT',
        team: rule.targetTeam,
        pointsPerUnit: rule.pointsPerUnit,
        resourceKey: interaction.resourceKey,
        units: interaction.units,
        timestamp: interaction.timestamp,
      };
    }

    return null;
  }
}
