import { describe, expect, it, beforeEach } from 'vitest';
import { useOverlayStore } from '../use-overlay-store';
import type { AxBConfig, AxBProjection, ContributionAlert } from '@/api/types';

const mockConfig: AxBConfig = {
  teamA: { id: 'A', name: 'Guerreiros', color: '#ff4b4b' },
  teamB: { id: 'B', name: 'Magos', color: '#00d2ff' },
  scoreGoal: 100,
  commentCooldownMs: 3000,
  intervalDurationMs: 5000,
  giftRules: [
    { resourceKey: 'rose', targetTeam: 'A', pointsPerUnit: 10 },
    { resourceKey: 'heart', targetTeam: 'B', pointsPerUnit: 20 },
  ],
};

const baseProjection: AxBProjection = {
  round: 1,
  roundStatus: 'ACTIVE',
  scoreGoal: 100,
  teamA: {
    id: 'A',
    name: 'Guerreiros',
    color: '#ff4b4b',
    score: 50,
    wins: 0,
    progressPercentage: 50,
    relativePercentage: 50,
  },
  teamB: {
    id: 'B',
    name: 'Magos',
    color: '#00d2ff',
    score: 50,
    wins: 0,
    progressPercentage: 50,
    relativePercentage: 50,
  },
  history: [],
  isPaused: false,
  pendingCount: 0,
  lastWinner: null,
};

describe('useOverlayStore', () => {
  beforeEach(() => {
    useOverlayStore.getState().reset();
  });

  it('initializes with default empty state', () => {
    const state = useOverlayStore.getState();

    expect(state.projection).toBeNull();
    expect(state.config).toBeNull();
    expect(state.gameId).toBeNull();
    expect(state.connected).toBe(false);
    expect(state.alerts).toEqual([]);
    expect(state.celebration).toBeNull();
  });

  it('updates config, gameId and connection status', () => {
    const store = useOverlayStore.getState();
    store.setConfig(mockConfig);
    store.setGameId('axb');
    store.setConnected(true);

    const updated = useOverlayStore.getState();
    expect(updated.config).toEqual(mockConfig);
    expect(updated.gameId).toBe('axb');
    expect(updated.connected).toBe(true);
  });

  describe('Alerts grouping, limit and TTL', () => {
    beforeEach(() => {
      useOverlayStore.getState().setConfig(mockConfig);
    });

    it('adds contribution alert and derives points and target team from giftRules', () => {
      const alert: ContributionAlert = {
        userId: 'u1',
        userName: 'Alice',
        resourceKey: 'rose',
        units: 2,
        timestamp: 1000,
      };

      useOverlayStore.getState().pushAlert(alert, 1000);

      const state = useOverlayStore.getState();
      expect(state.alerts).toHaveLength(1);
      expect(state.alerts[0]).toMatchObject({
        userId: 'u1',
        userName: 'Alice',
        resourceKey: 'rose',
        units: 2,
        points: 20, // 2 * 10
        team: 'A',
        timestamp: 1000,
        expiresAt: 5000, // 1000 + 4000
      });
    });

    it('handles unknown gifts with null points and team', () => {
      const alert: ContributionAlert = {
        userId: 'u1',
        userName: 'Alice',
        resourceKey: 'diamond',
        units: 1,
        timestamp: 1000,
      };

      useOverlayStore.getState().pushAlert(alert, 1000);

      const state = useOverlayStore.getState();
      expect(state.alerts[0]).toMatchObject({
        resourceKey: 'diamond',
        points: null,
        team: null,
      });
    });

    it('aggregates alerts from same user and gift within 1.5s window', () => {
      const alert1: ContributionAlert = {
        userId: 'u1',
        userName: 'Alice',
        resourceKey: 'rose',
        units: 2,
        timestamp: 1000,
      };

      const alert2: ContributionAlert = {
        userId: 'u1',
        userName: 'Alice',
        resourceKey: 'rose',
        units: 3,
        timestamp: 2000, // 1.0s later <= 1.5s
      };

      useOverlayStore.getState().pushAlert(alert1, 1000);
      useOverlayStore.getState().pushAlert(alert2, 2000);

      const state = useOverlayStore.getState();
      expect(state.alerts).toHaveLength(1);
      expect(state.alerts[0]).toMatchObject({
        userId: 'u1',
        units: 5,
        points: 50,
        timestamp: 2000,
        expiresAt: 6000, // 2000 + 4000
      });
    });

    it('does not aggregate if beyond 1.5s window', () => {
      const alert1: ContributionAlert = {
        userId: 'u1',
        userName: 'Alice',
        resourceKey: 'rose',
        units: 1,
        timestamp: 1000,
      };

      const alert2: ContributionAlert = {
        userId: 'u1',
        userName: 'Alice',
        resourceKey: 'rose',
        units: 1,
        timestamp: 2600, // 1.6s later > 1.5s
      };

      useOverlayStore.getState().pushAlert(alert1, 1000);
      useOverlayStore.getState().pushAlert(alert2, 2600);

      const state = useOverlayStore.getState();
      expect(state.alerts).toHaveLength(2);
      expect(state.alerts[0].units).toBe(1);
      expect(state.alerts[1].units).toBe(1);
    });

    it('limits visible alerts to max 4', () => {
      for (let i = 1; i <= 6; i++) {
        useOverlayStore.getState().pushAlert(
          {
            userId: `u${i}`,
            userName: `User ${i}`,
            resourceKey: 'rose',
            units: 1,
            timestamp: 1000 + i * 10,
          },
          1000 + i * 10,
        );
      }

      const state = useOverlayStore.getState();
      expect(state.alerts).toHaveLength(4);
      // Retains the most recent 4 alerts
      expect(state.alerts[0].userId).toBe('u3');
      expect(state.alerts[3].userId).toBe('u6');
    });

    it('cleans up expired alerts older than 4 seconds', () => {
      useOverlayStore.getState().pushAlert(
        {
          userId: 'u1',
          userName: 'Alice',
          resourceKey: 'rose',
          units: 1,
          timestamp: 1000,
        },
        1000,
      );

      useOverlayStore.getState().cleanupExpiredAlerts(3000); // not expired yet (expiresAt = 5000)
      expect(useOverlayStore.getState().alerts).toHaveLength(1);

      useOverlayStore.getState().cleanupExpiredAlerts(5001); // expired!
      expect(useOverlayStore.getState().alerts).toHaveLength(0);
    });
  });

  describe('Celebration Transitions', () => {
    it('triggers celebration when projection transitions from ACTIVE to INTERVAL', () => {
      useOverlayStore.getState().setConfig(mockConfig);

      // 1. Initial ACTIVE projection
      const res1 = useOverlayStore.getState().applyProjection(baseProjection);
      expect(res1.celebrationTriggered).toBe(false);
      expect(useOverlayStore.getState().celebration).toBeNull();

      // 2. Transition to INTERVAL with winner A
      const intervalProjection: AxBProjection = {
        ...baseProjection,
        roundStatus: 'INTERVAL',
        lastWinner: 'A',
      };

      const res2 = useOverlayStore
        .getState()
        .applyProjection(intervalProjection);
      expect(res2.celebrationTriggered).toBe(true);

      const celebration = useOverlayStore.getState().celebration;
      expect(celebration).not.toBeNull();
      expect(celebration?.winner).toBe('A');
      expect(celebration?.intervalDurationMs).toBe(5000);
      expect(celebration?.endsAt).toBeGreaterThan(Date.now() - 100);
    });

    it('clears celebration when round resumes to ACTIVE', () => {
      useOverlayStore.getState().setConfig(mockConfig);

      useOverlayStore.getState().applyProjection(baseProjection);
      useOverlayStore.getState().applyProjection({
        ...baseProjection,
        roundStatus: 'INTERVAL',
        lastWinner: 'B',
      });

      expect(useOverlayStore.getState().celebration).not.toBeNull();

      // New round ACTIVE
      useOverlayStore.getState().applyProjection({
        ...baseProjection,
        round: 2,
        roundStatus: 'ACTIVE',
      });

      expect(useOverlayStore.getState().celebration).toBeNull();
    });
  });
});
