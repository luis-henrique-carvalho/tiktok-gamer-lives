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
 * VARIANTE A — "Duelo Dividido": Fiel à referência da live TikTok.
 * - Topo: Placares gigantes e brasões de time, VS central com raio de batalha.
 * - Centro / Inferior: Torres de blocos empilhados alinhadas perfeitamente às laterais com colunas de presentes.
 * - Área segura de 20% reservada para o TikTok.
 */
export function PrototypeVariantA({
  projection,
  config,
  alerts,
  celebration,
}: AxBRendererProps) {
  const scene = resolveScene(projection, config);
  const { teamA, teamB } = scene;

  return (
    <div className="relative w-full h-full overflow-hidden select-none pointer-events-none font-sans text-white flex flex-col justify-between">
      {/* Fundo Épico Dividido com Raios e Suporte a Imagem Temática */}
      <SplitBackdrop
        colorA={teamA.color}
        colorB={teamB.color}
        intensity={1.0}
        backgroundUrl={scene.backgroundUrl}
      />

      {/* 80% Live Stage Area (Área superior de conteúdo do jogo) */}
      <div className="relative z-10 flex flex-col w-full h-[80%] px-4 pt-4 justify-between">
        {/* Header do Placar e VS */}
        <header className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 w-full">
          <TeamScoreTitle team={teamA} />

          {/* Seção Central de VS e Meta */}
          <div className="flex flex-col items-center gap-1 pt-2">
            <span
              className="text-5xl sm:text-6xl font-black italic tracking-tighter text-amber-300 drop-shadow-[0_4px_16px_rgba(245,158,11,0.8)]"
              style={{
                WebkitTextStroke: '2.5px #000000',
                paintOrder: 'stroke fill',
              }}
            >
              VS
            </span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/90 bg-black/70 px-2.5 py-0.5 rounded-full border border-white/20">
              {formatScore(scene.scoreGoal)} PTS = 1 VITÓRIA
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge
                variant="secondary"
                className="font-black text-[11px] px-2 bg-white/20 text-white"
              >
                RODADA {scene.round}
              </Badge>
              {scene.showCta && (
                <Badge className="font-black text-[11px] px-2 bg-amber-400 text-black hover:bg-amber-400 animate-pulse">
                  COMENTE A OU B
                </Badge>
              )}
            </div>
          </div>

          <TeamScoreTitle team={teamB} />
        </header>

        {/* Arena Central: Torres de Blocos e Colunas de Presentes */}
        <div className="relative flex-1 flex items-end justify-between px-2 pb-2 mt-auto">
          {/* Coluna de Presentes Esquerda (Time A) */}
          <div className="z-10">
            <GiftLegend rules={scene.giftRulesA} color={teamA.color} />
          </div>

          {/* As Duas Torres de Blocos Isométricos (Mais finas para centro livre) */}
          <div className="flex items-end justify-around flex-1 px-2">
            <TileTower
              color={teamA.color}
              tiles={scene.tilesA}
              width={140}
              tileHeight={18}
            />
            <TileTower
              color={teamB.color}
              tiles={scene.tilesB}
              width={140}
              tileHeight={18}
            />
          </div>

          {/* Coluna de Presentes Direita (Time B) */}
          <div className="z-10">
            <GiftLegend rules={scene.giftRulesB} color={teamB.color} />
          </div>
        </div>
      </div>

      {/* 20% Inferior Reservado para a Interface Nativa do TikTok (RF-15) */}
      <div className="w-full h-[20%] pointer-events-none" />

      {/* Feed de Alertas de Presentes: Ancorado no rodapé inferior da tela (RF-15 / Safe Zone) */}
      <ThemeAlertsBottomBar alerts={alerts} />

      {/* Faixa de Celebração de Vitória */}
      {celebration && (
        <RoundCelebrationBanner celebration={celebration} config={config} />
      )}
    </div>
  );
}
