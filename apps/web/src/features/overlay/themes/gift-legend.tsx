import { cn } from '@/lib/utils';
import type { AxBGiftRule } from '@/api/types';

const MAX_LEGEND_ITEMS = 6;

const GIFT_ICONS: Readonly<Record<string, string>> = {
  rose: '🌹',
  coffee: '☕',
  heart: '❤️',
  galaxy: '🌌',
  lion: '🦁',
  crown: '👑',
  diamond: '💎',
};

export interface GiftLegendProps {
  readonly rules: readonly AxBGiftRule[];
  readonly color: string;
  readonly direction?: 'column' | 'row';
}

function cleanResourceName(key: string): string {
  if (key.startsWith('tiktok:gift:')) {
    return `ID ${key.replace('tiktok:gift:', '')}`;
  }
  return key;
}

export function GiftLegend({
  rules,
  color,
  direction = 'column',
}: GiftLegendProps) {
  const shown = rules.slice(0, MAX_LEGEND_ITEMS);
  if (shown.length === 0) return null;

  return (
    <ul
      className={cn(
        'flex gap-2.5 pointer-events-none select-none',
        direction === 'column'
          ? 'flex-col items-center w-28'
          : 'flex-wrap justify-center',
      )}
    >
      {shown.map((rule) => (
        <li
          key={rule.resourceKey}
          className="flex flex-col items-center leading-none gap-0.5 group"
        >
          {/* Caixa do Ícone com Glow da cor do time */}
          <div
            className="size-12 sm:size-14 rounded-2xl flex items-center justify-center text-3xl bg-black/75 border-2 shadow-lg transition-transform"
            style={{
              borderColor: color,
              boxShadow: `0 0 12px color-mix(in srgb, ${color} 60%, transparent)`,
            }}
          >
            {GIFT_ICONS[rule.resourceKey] ?? '🎁'}
          </div>

          {/* Nome Legível do Presente */}
          <span
            className="text-[10px] font-black uppercase tracking-wider text-white text-center max-w-full truncate px-1 mt-0.5"
            style={{ textShadow: '0 2px 4px #000000' }}
            title={rule.resourceKey}
          >
            {cleanResourceName(rule.resourceKey)}
          </span>

          {/* Valor de pontos em Verde Fluorescente */}
          <span
            className="text-base sm:text-lg font-black tracking-tight"
            style={{
              color: '#22c55e',
              textShadow: '0 0 10px rgba(34,197,94,0.8), 0 2px 4px #000000',
            }}
          >
            +{rule.pointsPerUnit}
          </span>
        </li>
      ))}
    </ul>
  );
}
