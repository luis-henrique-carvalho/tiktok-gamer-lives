import type {
  AxBConfig,
  AxBGiftRule,
  AxBProjection,
  AxBTeamProjection,
} from '@/api/types';

/** Limite de blocos por torre (RF-17: limitar elementos simultâneos). */
export const MAX_TILES = 40;

export interface PrototypeScene {
  readonly teamA: AxBTeamProjection & { readonly avatarUrl?: string };
  readonly teamB: AxBTeamProjection & { readonly avatarUrl?: string };
  readonly scoreGoal: number;
  readonly round: number;
  readonly showCta: boolean;
  readonly tilesA: number;
  readonly tilesB: number;
  readonly giftRulesA: readonly AxBGiftRule[];
  readonly giftRulesB: readonly AxBGiftRule[];
  readonly backgroundUrl?: string;
}

function fallbackTeam(
  id: 'A' | 'B',
  name: string,
  color: string,
): AxBTeamProjection {
  return {
    id,
    name,
    color,
    score: 0,
    wins: 0,
    progressPercentage: 0,
    relativePercentage: 50,
  };
}

function toTiles(team: AxBTeamProjection): number {
  const progress = Math.min(100, Math.max(0, team.progressPercentage));
  const tiles = Math.round((progress / 100) * MAX_TILES);
  return team.score > 0 ? Math.max(1, tiles) : tiles;
}

export function resolveScene(
  projection: AxBProjection | null,
  config: AxBConfig | null,
): PrototypeScene {
  const teamA =
    projection?.teamA ??
    fallbackTeam(
      'A',
      config?.teamA.name ?? 'Time A',
      config?.teamA.color ?? '#ef4444',
    );
  const teamB =
    projection?.teamB ??
    fallbackTeam(
      'B',
      config?.teamB.name ?? 'Time B',
      config?.teamB.color ?? '#3b82f6',
    );
  const rules = config?.giftRules ?? [];

  const teamAConfig = config?.teamA as
    (AxBTeamProjection & { avatarUrl?: string }) | undefined;
  const teamBConfig = config?.teamB as
    (AxBTeamProjection & { avatarUrl?: string }) | undefined;
  const extraConfig = config as { backgroundUrl?: string } | undefined;

  return {
    teamA: {
      ...teamA,
      avatarUrl: teamAConfig?.avatarUrl,
    },
    teamB: {
      ...teamB,
      avatarUrl: teamBConfig?.avatarUrl,
    },
    scoreGoal: projection?.scoreGoal ?? config?.scoreGoal ?? 1000,
    round: projection?.round ?? 1,
    showCta:
      !(projection?.isPaused ?? false) &&
      projection?.roundStatus !== 'INTERVAL',
    tilesA: toTiles(teamA),
    tilesB: toTiles(teamB),
    giftRulesA: rules.filter((rule) => rule.targetTeam === 'A'),
    giftRulesB: rules.filter((rule) => rule.targetTeam === 'B'),
    backgroundUrl: extraConfig?.backgroundUrl,
  };
}
