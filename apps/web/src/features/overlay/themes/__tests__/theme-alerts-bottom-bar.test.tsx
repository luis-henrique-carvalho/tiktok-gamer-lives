import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThemeAlertsBottomBar } from '../theme-alerts-bottom-bar';
import type { OverlayAlert } from '../../stores/use-overlay-store';

describe('ThemeAlertsBottomBar', () => {
  it('renders alerts segregated by team and neutral categories', () => {
    const alerts: OverlayAlert[] = [
      {
        id: '1',
        groupKey: 'u1:rose',
        userId: 'u1',
        userName: 'GamerAlpha',
        resourceKey: 'rose',
        units: 2,
        points: 20,
        team: 'A',
        timestamp: 100,
        expiresAt: 5000,
      },
      {
        id: '2',
        groupKey: 'u2:coffee',
        userId: 'u2',
        userName: 'GamerBeta',
        resourceKey: 'tiktok:gift:5655',
        units: 1,
        points: 50,
        team: 'B',
        timestamp: 200,
        expiresAt: 5000,
      },
      {
        id: '3',
        groupKey: 'u3:heart',
        userId: 'u3',
        userName: 'GamerOmega',
        resourceKey: 'heart',
        units: 3,
        points: 30,
        team: null,
        timestamp: 300,
        expiresAt: 5000,
      },
    ];

    render(<ThemeAlertsBottomBar alerts={alerts} />);

    expect(screen.getByText('GamerAlpha')).toBeInTheDocument();
    expect(screen.getByText('GamerBeta')).toBeInTheDocument();
    expect(screen.getByText('GamerOmega')).toBeInTheDocument();
    expect(screen.getByText('ID 5655')).toBeInTheDocument();
  });

  it('limits rendering to the two most recent alerts per team', () => {
    const alerts: OverlayAlert[] = [
      {
        id: '1',
        groupKey: 'u1:rose',
        userId: 'u1',
        userName: 'OldAlert',
        resourceKey: 'rose',
        units: 1,
        points: 10,
        team: 'A',
        timestamp: 100,
        expiresAt: 5000,
      },
      {
        id: '2',
        groupKey: 'u2:rose',
        userId: 'u2',
        userName: 'RecentAlert1',
        resourceKey: 'rose',
        units: 1,
        points: 10,
        team: 'A',
        timestamp: 200,
        expiresAt: 5000,
      },
      {
        id: '3',
        groupKey: 'u3:rose',
        userId: 'u3',
        userName: 'RecentAlert2',
        resourceKey: 'rose',
        units: 1,
        points: 10,
        team: 'A',
        timestamp: 300,
        expiresAt: 5000,
      },
    ];

    render(<ThemeAlertsBottomBar alerts={alerts} />);

    expect(screen.queryByText('OldAlert')).not.toBeInTheDocument();
    expect(screen.getByText('RecentAlert1')).toBeInTheDocument();
    expect(screen.getByText('RecentAlert2')).toBeInTheDocument();
  });
});
