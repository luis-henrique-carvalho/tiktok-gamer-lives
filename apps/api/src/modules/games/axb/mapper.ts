import type { GameInputMapper } from '../../../contracts/engine.js';
import type { GameInteraction } from '../../../contracts/ingress.js';
import type { AxBCommand, AxBConfig } from './types.js';

const GIFT_ALIASES: Record<string, string[]> = {
  'tiktok:gift:5655': ['rose', 'rosa'],
  'tiktok:gift:5879': ['perfume', 'heart', 'coracao'],
  'tiktok:gift:5827': ['gg'],
  'tiktok:gift:6064': ['fire', 'fogo'],
};

function matchesGiftKey(ruleKey: string, interactionKey: string): boolean {
  if (ruleKey === interactionKey) return true;
  const directAliases = GIFT_ALIASES[interactionKey];
  if (directAliases && directAliases.includes(ruleKey.toLowerCase()))
    return true;
  const reverseAliases = GIFT_ALIASES[ruleKey];
  if (reverseAliases && reverseAliases.includes(interactionKey.toLowerCase()))
    return true;
  return false;
}

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
      const rule = config.giftRules.find((r) =>
        matchesGiftKey(r.resourceKey, interaction.resourceKey),
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
