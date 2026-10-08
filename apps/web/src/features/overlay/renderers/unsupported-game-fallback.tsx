import { AlertCircle } from 'lucide-react';
import { Typography } from '@/components/ui/typography';

export interface UnsupportedGameFallbackProps {
  readonly gameId: string | null;
}

export function UnsupportedGameFallback({
  gameId,
}: UnsupportedGameFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground gap-3">
      <AlertCircle className="size-10 text-amber-500" />
      <Typography variant="h3" className="text-foreground font-bold">
        Jogo não suportado
      </Typography>
      <Typography variant="p">
        Identificador do jogo &quot;{gameId ?? 'desconhecido'}&quot; não possui
        um tema de overlay registrado.
      </Typography>
    </div>
  );
}
