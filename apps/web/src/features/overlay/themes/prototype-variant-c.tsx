import { Badge } from '@/components/ui/badge';
import { ThemeAlertsBottomBar } from './theme-alerts-bottom-bar';
import { RoundCelebrationBanner } from '../components/round-celebration-banner';
import { formatScore } from '../formatters';
import { GiftLegend } from './gift-legend';
import { resolveScene } from './prototype-shared';
import { TeamScoreTitle } from './team-score-title';
import { TileTower } from './tile-tower';
import type { AxBRendererProps } from '../renderers/overlay-renderer-registry';

/**
 * VARIANTE C — "Flancos Transparentes": sem fundo, só duas colunas estreitas
 * nas laterais (placar + torre + presentes) e o centro 100% livre.
 */
export function PrototypeVariantC({
  projection,
  config,
  alerts,
  celebration,
}: AxBRendererProps) {
  const scene = resolveScene(projection, config);
  const { teamA, teamB } = scene;

  return (
    <div className="relative w-full h-full overflow-hidden select-none pointer-events-none font-sans text-white">
      <div className="relative z-10 flex flex-col w-full h-[80%] px-4 pt-6">
        <div className="flex items-center justify-center gap-3">
          <Badge variant="secondary" className="font-black">
            Rodada {scene.round}
          </Badge>
          <span className="text-xs font-bold uppercase">
            Meta {formatScore(scene.scoreGoal)} pts
          </span>
          {scene.showCta && (
            <Badge className="font-black bg-white text-black">
              Comente A ou B
            </Badge>
          )}
        </div>

        <div className="flex-1 flex items-end justify-between pt-4">
          <div className="flex flex-col items-start gap-4">
            <TeamScoreTitle team={teamA} size="sm" />
            <div className="flex items-end gap-3">
              <TileTower
                color={teamA.color}
                tiles={scene.tilesA}
                width={150}
                tileHeight={20}
              />
              <GiftLegend rules={scene.giftRulesA} color={teamA.color} />
            </div>
          </div>
          <div className="flex flex-col items-end gap-4">
            <TeamScoreTitle team={teamB} size="sm" />
            <div className="flex items-end gap-3">
              <GiftLegend rules={scene.giftRulesB} color={teamB.color} />
              <TileTower
                color={teamB.color}
                tiles={scene.tilesB}
                width={150}
                tileHeight={20}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full h-[20%]" />

      {/* Feed de Alertas de Presentes: Ancorado na base inferior */}
      <ThemeAlertsBottomBar alerts={alerts} />

      {celebration && (
        <RoundCelebrationBanner celebration={celebration} config={config} />
      )}
    </div>
  );
}
