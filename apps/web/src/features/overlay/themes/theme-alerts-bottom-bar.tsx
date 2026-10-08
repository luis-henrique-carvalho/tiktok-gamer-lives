import { ContributionAlertBadge } from '../components/contribution-alert-badge';
import type { OverlayAlert } from '../stores/use-overlay-store';

export interface ThemeAlertsBottomBarProps {
  readonly alerts: readonly OverlayAlert[];
}

/**
 * Rodapé inferior para exibição de alertas de presentes em lives de duelo (RF-15).
 * Ancorado estritamente na safe zone inferior para não cobrir o placar nem ser cortado por overflow.
 */
export function ThemeAlertsBottomBar({ alerts }: ThemeAlertsBottomBarProps) {
  const alertsA = alerts
    .filter((a) => a.team === 'A')
    .slice(-2)
    .reverse();

  const alertsNeutral = alerts
    .filter((a) => a.team !== 'A' && a.team !== 'B')
    .slice(-2)
    .reverse();

  const alertsB = alerts
    .filter((a) => a.team === 'B')
    .slice(-2)
    .reverse();

  return (
    <div className="absolute inset-x-0 bottom-4 z-30 pointer-events-none px-4 flex justify-between items-end gap-2 select-none">
      {/* Alertas Time A (Lado Esquerdo Inferior) */}
      <div className="flex flex-col-reverse items-start gap-1.5 max-w-[220px]">
        {alertsA.map((alert) => (
          <ContributionAlertBadge key={alert.id} alert={alert} />
        ))}
      </div>

      {/* Alertas Neutros (Centro Inferior) */}
      <div className="flex flex-col-reverse items-center gap-1.5 max-w-[220px]">
        {alertsNeutral.map((alert) => (
          <ContributionAlertBadge key={alert.id} alert={alert} />
        ))}
      </div>

      {/* Alertas Time B (Lado Direito Inferior) */}
      <div className="flex flex-col-reverse items-end gap-1.5 max-w-[220px]">
        {alertsB.map((alert) => (
          <ContributionAlertBadge key={alert.id} alert={alert} />
        ))}
      </div>
    </div>
  );
}
