export interface SplitBackdropProps {
  readonly colorA: string;
  readonly colorB: string;
  readonly intensity?: number;
  readonly backgroundUrl?: string;
}

export function SplitBackdrop({
  colorA,
  colorB,
  intensity = 1.0,
  backgroundUrl,
}: SplitBackdropProps) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
    >
      {/* Imagem de Fundo Temática do Usuário (se configurada) */}
      {backgroundUrl && (
        <div className="absolute inset-0 z-0">
          <img
            src={backgroundUrl}
            alt="Theme Wallpaper"
            className="w-full h-full object-cover"
          />
          {/* Vinheta escura para garantir contraste máximo do jogo sobre a imagem */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/85" />
        </div>
      )}

      {/* Camada de Efeitos de Tempestade / Raio (com opacidade ajustada se houver foto) */}
      <div
        className="absolute inset-0 z-1"
        style={{ opacity: backgroundUrl ? 0.45 * intensity : intensity }}
      >
        {/* Lado Esquerdo - Fogo / Vermelho Escuro Dramático com Raios */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: 'polygon(0 0, 52% 0, 48% 100%, 0 100%)',
            background: `
            radial-gradient(circle at 20% 15%, color-mix(in srgb, ${colorA} 90%, white) 0%, transparent 40%),
            radial-gradient(circle at 30% 60%, ${colorA} 0%, transparent 65%),
            linear-gradient(135deg, #3f0404 0%, #150101 60%, #080000 100%)
          `,
          }}
        >
          {/* Textura de Relâmpagos e Nebulosa Vermelha */}
          <div
            className="absolute inset-0 opacity-40 mix-blend-screen"
            style={{
              background: `radial-gradient(ellipse at 40% 30%, ${colorA} 0%, transparent 60%)`,
              filter: 'contrast(180%)',
            }}
          />
        </div>

        {/* Lado Direito - Tempestade Cósmica / Azul Profundo com Relâmpagos */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: 'polygon(52% 0, 100% 0, 100% 100%, 48% 100%)',
            background: `
            radial-gradient(circle at 80% 15%, color-mix(in srgb, ${colorB} 90%, white) 0%, transparent 40%),
            radial-gradient(circle at 70% 60%, ${colorB} 0%, transparent 65%),
            linear-gradient(225deg, #03204a 0%, #020a1c 60%, #01040a 100%)
          `,
          }}
        >
          {/* Textura de Nebulosa Azul Elétrico */}
          <div
            className="absolute inset-0 opacity-40 mix-blend-screen"
            style={{
              background: `radial-gradient(ellipse at 60% 30%, ${colorB} 0%, transparent 60%)`,
              filter: 'contrast(180%)',
            }}
          />
        </div>

        {/* Raio Central Intenso (Clash de Energia) */}
        <svg
          className="absolute inset-0 size-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* Glow externo difuso */}
          <polyline
            points="52,0 49,25 53,45 47,70 51,85 48,100"
            fill="none"
            stroke="#ffffff"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            style={{
              filter:
                'drop-shadow(0 0 16px #60a5fa) drop-shadow(0 0 24px #ef4444)',
              opacity: 0.8,
            }}
          />
          {/* Núcleo de raio branco ofuscante */}
          <polyline
            points="52,0 49,25 53,45 47,70 51,85 48,100"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            style={{
              filter: 'drop-shadow(0 0 4px #ffffff)',
            }}
          />
          {/* Ramificação de faísca */}
          <path
            d="M 50 35 L 43 42 M 52 60 L 58 68"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            style={{ opacity: 0.75, filter: 'drop-shadow(0 0 6px #ffffff)' }}
          />
        </svg>
      </div>
    </div>
  );
}
