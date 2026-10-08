import { MAX_TILES } from './prototype-shared';

const TILE_IDS = Array.from({ length: MAX_TILES }, (_, i) => `tile-${i}`);

export interface TileTowerProps {
  readonly color: string;
  readonly tiles: number;
  readonly width?: number;
  readonly tileHeight?: number;
}

export function TileTower({
  color,
  tiles,
  width = 150,
  tileHeight = 18,
}: TileTowerProps) {
  const visibleCount = Math.min(tiles, MAX_TILES);
  // Fatiamos os blocos de baixo para cima
  const visible = TILE_IDS.slice(0, visibleCount);

  // Cores isométricas
  const mainColor = color;
  const shadowColor = `color-mix(in srgb, ${color} 50%, black)`;
  const topHighlight = `color-mix(in srgb, ${color} 75%, white)`;

  return (
    <div
      data-testid="tile-tower"
      className="flex flex-col-reverse items-center relative"
      style={{ width }}
    >
      {/* Base da torre / plataforma isométrica no chão */}
      <div
        className="w-full h-4 rounded-b-md shadow-2xl"
        style={{
          background: shadowColor,
          border: '3px solid #000000',
        }}
      />

      {/* Blocos empilhados da torre (ordem inversa: primeiro renderizado é a base) */}
      {visible.map((id, index) => (
        <div
          key={id}
          className="w-full relative border-x-2 border-t-2 border-black/90 transition-all duration-300"
          style={{
            height: tileHeight,
            background: `linear-gradient(90deg, ${mainColor} 0% 75%, ${shadowColor} 75% 100%)`,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)',
          }}
        >
          {/* Se for o topo da pilha, renderiza a tampa isométrica */}
          {index === visibleCount - 1 && (
            <div
              className="absolute -top-3 inset-x-0 h-4 border-2 border-black/90"
              style={{
                clipPath: 'polygon(12% 0%, 100% 0%, 88% 100%, 0% 100%)',
                background: topHighlight,
                boxShadow: '0 0 15px rgba(255,255,255,0.6)',
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
