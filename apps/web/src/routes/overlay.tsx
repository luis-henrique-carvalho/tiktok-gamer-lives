import { createFileRoute } from '@tanstack/react-router';
import { parseOverlaySearch } from '@/lib/overlay-url';
import { OverlayView } from '@/features/overlay/views/overlay-view';

export const Route = createFileRoute('/overlay')({
  validateSearch: parseOverlaySearch,
  component: OverlayRouteComponent,
});

export function OverlayRouteComponent() {
  const search = Route.useSearch();
  return <OverlayView search={search} />;
}
