import { Badge } from '@/components/ui/badge';

export interface NeonTowerProps {
  readonly teamName: string;
  readonly progress: number;
  readonly side: 'left' | 'right';
}

const PARTICLE_KEYS = [
  'pt-0',
  'pt-1',
  'pt-2',
  'pt-3',
  'pt-4',
  'pt-5',
  'pt-6',
  'pt-7',
  'pt-8',
  'pt-9',
  'pt-10',
  'pt-11',
];

export function NeonTower({ progress, side }: NeonTowerProps) {
  const isLeft = side === 'left';
  const borderClasses = isLeft
    ? 'border-2 border-red-500/30 bg-red-950/20'
    : 'border-2 border-cyan-500/30 bg-cyan-950/20';

  const gradientClasses = isLeft
    ? 'bg-linear-to-t from-red-600 via-red-500 to-rose-400 shadow-[0_0_30px_rgba(239,68,68,0.8)]'
    : 'bg-linear-to-t from-cyan-600 via-cyan-500 to-sky-400 shadow-[0_0_30px_rgba(6,182,212,0.8)]';

  const particleColorClasses = isLeft
    ? 'bg-rose-200 shadow-[0_0_8px_#ff4b4b]'
    : 'bg-cyan-200 shadow-[0_0_8px_#00d2ff]';

  const badgeClasses = isLeft
    ? 'bg-red-950 border-red-500/50 text-red-300'
    : 'bg-cyan-950 border-cyan-500/50 text-cyan-300';

  return (
    <div className="relative w-28 h-80 flex flex-col justify-end items-center">
      {/* Tower Frame Background */}
      <div
        className={`absolute inset-0 rounded-2xl ${borderClasses} overflow-hidden backdrop-blur-xs`}
      >
        {/* GPU scaleY Tower Level */}
        <div
          className={`absolute inset-x-0 bottom-0 h-full ${gradientClasses} transition-transform duration-300 ease-out`}
          style={{
            transform: `scaleY(${progress / 100})`,
            transformOrigin: 'bottom',
          }}
        />

        {/* Up to 12 Neon Particles (RF-17) */}
        {PARTICLE_KEYS.map((key, i) => (
          <div
            key={key}
            className={`absolute size-2 rounded-full ${particleColorClasses} animate-particle`}
            style={{
              bottom: `${(i * 7) % 80}%`,
              left: `${15 + ((i * 17) % 70)}%`,
              animationDelay: `${(i * 0.2).toFixed(1)}s`,
            }}
          />
        ))}
      </div>

      {/* Tower Base Indicator */}
      <Badge
        variant="outline"
        className={`z-10 translate-y-3 px-3 py-1 rounded-full border shadow-md font-mono text-xs font-black ${badgeClasses}`}
      >
        {/* shadcn-ignore: decorativo */}
        {progress.toFixed(0)}%
      </Badge>
    </div>
  );
}
