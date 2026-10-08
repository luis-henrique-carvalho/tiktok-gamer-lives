import { Badge } from '@/components/ui/badge';
import { ThemeAlertsBottomBar } from './theme-alerts-bottom-bar';
import { RoundCelebrationBanner } from '../components/round-celebration-banner';
import { formatScore } from '../formatters';
import { GiftLegend } from './gift-legend';
import { resolveScene } from './prototype-shared';
import { SplitBackdrop } from './split-backdrop';
import { TeamScoreTitle } from './team-score-title';
import { TileTower } from './tile-tower';
import type { AxBRendererProps } from '../renderers/overlay-renderer-registry';

/**
 * VARIANTE B — "Torres nas Bordas": placar central compacto, torres largas
 * coladas nas bordas da tela, centro livre para a câmera/gameplay e
 * tabela de presentes numa faixa horizontal única.
 */
export function PrototypeVariantB({
  projection,
  config,
  alerts,
  celebration,
}: AxBRendererProps) {
  const scene = resolveScene(projection, config);
  const { teamA, teamB } = scene;
  const rules = [...scene.giftRulesA, ...scene.giftRulesB];

  return (
    <div className="relative w-full h-full overflow-hidden select-none pointer-events-none font-sans text-white">
      <SplitBackdrop
        colorA={teamA.color}
        colorB={teamB.color}
        intensity={0.3}
      />

      <div className="relative z-10 flex flex-col w-full h-[80%] pt-8">
        <header className="mx-8 grid grid-cols-2 gap-6 rounded-3xl bg-black/60 border-2 border-white/20 px-6 py-4">
          <TeamScoreTitle team={teamA} size="sm" />
          <TeamScoreTitle team={teamB} size="sm" />
          <div className="col-span-2 flex items-center justify-center gap-3">
            <Badge variant="secondary" className="font-black">
              Rodada {scene.round}
            </Badge>
            <span className="text-xs font-bold uppercase text-white/80">
              Meta {formatScore(scene.scoreGoal)} pts
            </span>
            {scene.showCta && (
              <Badge className="font-black bg-white text-black">
                Comente A ou B
              </Badge>
            )}
          </div>
        </header>

        <div className="px-8 pt-6">
          <GiftLegend rules={rules} color="#ffffff" direction="row" />
        </div>

        <div className="flex-1 flex items-end justify-between pt-6">
          <TileTower color={teamA.color} tiles={scene.tilesA} width={300} />
          <TileTower color={teamB.color} tiles={scene.tilesB} width={300} />
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
