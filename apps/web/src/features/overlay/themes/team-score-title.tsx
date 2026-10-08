import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatScore } from '../formatters';
import type { AxBTeamProjection } from '@/api/types';

export interface TeamScoreTitleProps {
  readonly team: AxBTeamProjection & { readonly avatarUrl?: string };
  readonly size?: 'lg' | 'sm';
}

export function TeamScoreTitle({ team, size = 'lg' }: TeamScoreTitleProps) {
  const isLg = size === 'lg';

  return (
    <div className="flex flex-col items-center gap-1 min-w-0 w-full max-w-[320px] select-none">
      {/* Avatar do Competidor (Foto redonda com borda neon ou Inicial) */}
      <div
        className={cn(
          'relative rounded-full flex items-center justify-center font-black shadow-2xl overflow-hidden border-4 transition-transform hover:scale-105',
          isLg ? 'size-20 sm:size-24' : 'size-14 sm:size-16',
        )}
        style={{
          borderColor: team.color,
          boxShadow: `0 0 25px ${team.color}80, 0 8px 16px rgba(0,0,0,0.8)`,
          background:
            'radial-gradient(circle, rgba(20,20,20,0.9) 0%, rgba(0,0,0,0.95) 100%)',
        }}
      >
        {team.avatarUrl ? (
          <img
            src={team.avatarUrl}
            alt={team.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span
            className={cn(
              'font-black font-mono',
              isLg ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl',
            )}
            style={{ color: team.color }}
          >
            {team.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Nome do Competidor com contorno 3D arcade */}
      <span
        className={cn(
          'font-black uppercase tracking-tight text-center leading-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] max-w-full px-1 line-clamp-1',
          isLg ? 'text-xl sm:text-2xl' : 'text-sm sm:text-base',
        )}
        style={{
          color: team.color,
          WebkitTextStroke: '1.2px #ffffff',
          paintOrder: 'stroke fill',
          textShadow: '0 0 16px rgba(0,0,0,0.9), 0 3px 6px #000000',
        }}
        title={team.name}
      >
        {team.name}
      </span>

      {/* Placar Gigante Arcade */}
      <span
        className={cn(
          'font-black font-mono leading-none text-white tracking-tighter drop-shadow-[0_6px_16px_rgba(0,0,0,1)]',
          isLg ? 'text-6xl sm:text-7xl md:text-8xl' : 'text-4xl sm:text-5xl',
        )}
        style={{
          WebkitTextStroke: '3.5px #000000',
          paintOrder: 'stroke fill',
          textShadow: '0 0 25px rgba(255,255,255,0.4)',
        }}
      >
        {formatScore(team.score)}
      </span>

      {/* Selo de Vitórias */}
      <Badge
        variant="outline"
        className="bg-black/85 border-2 border-white/50 text-white font-black text-[11px] sm:text-xs px-3 py-0.5 rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.7)] uppercase tracking-wider backdrop-blur-md"
      >
        VITÓRIAS {team.wins}
      </Badge>
    </div>
  );
}
