import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { parseOverlaySearch } from '@/lib/overlay-url';
import { OverlayView } from '@/features/overlay/views/overlay-view';
import {
  PrototypeSwitcher,
  type PrototypeVariantDef,
} from '@/components/ui/prototype-switcher';

const PROTOTYPE_VARIANTS: readonly PrototypeVariantDef[] = [
  {
    id: 'A',
    label: 'A: Duelo Dividido (fiel à referência)',
    description:
      'Fundo dividido com raio, placar gigante no topo, torres de blocos e presentes nas laterais',
  },
  {
    id: 'B',
    label: 'B: Torres nas Bordas',
    description:
      'Placar compacto, torres largas nas bordas, centro livre e presentes numa faixa única',
  },
  {
    id: 'C',
    label: 'C: Flancos Transparentes',
    description:
      'Sem fundo: duas colunas laterais com placar, torre e presentes; centro 100% livre',
  },
  {
    id: 'original',
    label: 'Original: Neon Arena',
    description: 'Torres verticais neon convencionais com partículas dinâmicas',
  },
];

export const Route = createFileRoute('/overlay')({
  validateSearch: parseOverlaySearch,
  component: OverlayRouteComponent,
});

export function OverlayRouteComponent() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const currentVariantId = search.variant ?? 'original';

  const handleSelectVariant = (variantId: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        variant:
          variantId === 'original' ? undefined : (variantId as 'A' | 'B' | 'C'),
      }),
      replace: true,
    });
  };

  return (
    <>
      <OverlayView search={search} activeVariant={search.variant} />
      <PrototypeSwitcher
        variants={PROTOTYPE_VARIANTS}
        currentVariantId={currentVariantId}
        onSelectVariant={handleSelectVariant}
      />
    </>
  );
}
