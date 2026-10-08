import { create } from 'zustand';
import type {
  AxBConfig,
  AxBProjection,
  AxBTeamId,
  ContributionAlert,
} from '@/api/types';

export interface OverlayAlert {
  readonly id: string;
  readonly groupKey: string;
  readonly userId: string;
  readonly userName: string;
  readonly resourceKey: string;
  readonly units: number;
  readonly points: number | null;
  readonly team: AxBTeamId | null;
  readonly timestamp: number;
  readonly expiresAt: number;
}

export interface OverlayCelebration {
  readonly winner: AxBTeamId;
  readonly endsAt: number;
  readonly intervalDurationMs: number;
}

export interface ApplyProjectionResult {
  readonly celebrationTriggered: boolean;
}

export interface OverlayStoreState {
  readonly projection: AxBProjection | null;
  readonly gameId: string | null;
  readonly config: AxBConfig | null;
  readonly connected: boolean;
  readonly alerts: readonly OverlayAlert[];
  readonly celebration: OverlayCelebration | null;

  setConnected: (connected: boolean) => void;
  setConfig: (config: AxBConfig) => void;
  setGameId: (gameId: string) => void;
  applyProjection: (projection: AxBProjection) => ApplyProjectionResult;
  pushAlert: (alert: ContributionAlert, now?: number) => void;
  cleanupExpiredAlerts: (now?: number) => void;
  clearCelebration: () => void;
  reset: () => void;
}

const ALERT_GROUPING_WINDOW_MS = 1500;
const ALERT_TTL_MS = 4000;
const MAX_VISIBLE_ALERTS = 4;

function calculateNextCelebration(
  prev: AxBProjection | null,
  next: AxBProjection,
  config: AxBConfig | null,
  currentCelebration: OverlayCelebration | null,
): { celebration: OverlayCelebration | null; triggered: boolean } {
  if (prev?.roundStatus === 'ACTIVE' && next.roundStatus === 'INTERVAL') {
    const winner: AxBTeamId =
      next.lastWinner ?? (next.teamA.score >= next.scoreGoal ? 'A' : 'B');
    const intervalDurationMs = config?.intervalDurationMs ?? 5000;
    return {
      celebration: {
        winner,
        endsAt: Date.now() + intervalDurationMs,
        intervalDurationMs,
      },
      triggered: true,
    };
  }

  if (next.roundStatus === 'ACTIVE') {
    return { celebration: null, triggered: false };
  }

  return { celebration: currentCelebration, triggered: false };
}

function aggregateAlert(
  currentAlerts: readonly OverlayAlert[],
  alert: ContributionAlert,
  config: AxBConfig | null,
  now: number,
): readonly OverlayAlert[] {
  let pointsPerUnit: number | null = null;
  let team: AxBTeamId | null = null;

  if (config?.giftRules) {
    const rule = config.giftRules.find(
      (r) => r.resourceKey === alert.resourceKey,
    );
    if (rule) {
      pointsPerUnit = rule.pointsPerUnit;
      team = rule.targetTeam;
    }
  }

  const calculatedPoints =
    pointsPerUnit !== null ? pointsPerUnit * alert.units : null;
  const groupKey = `${alert.userId}:${alert.resourceKey}`;
  const unexpired = currentAlerts.filter((a) => a.expiresAt > now);

  const existingIndex = unexpired.findIndex(
    (a) =>
      a.groupKey === groupKey && now - a.timestamp <= ALERT_GROUPING_WINDOW_MS,
  );

  if (existingIndex !== -1) {
    const existing = unexpired[existingIndex];
    const updatedAlert: OverlayAlert = {
      ...existing,
      units: existing.units + alert.units,
      points:
        existing.points !== null && calculatedPoints !== null
          ? existing.points + calculatedPoints
          : (calculatedPoints ?? existing.points),
      timestamp: now,
      expiresAt: now + ALERT_TTL_MS,
    };

    const nextList = [...unexpired];
    nextList[existingIndex] = updatedAlert;
    return nextList.length > MAX_VISIBLE_ALERTS
      ? nextList.slice(-MAX_VISIBLE_ALERTS)
      : nextList;
  }

  const newAlert: OverlayAlert = {
    id: `${groupKey}-${now}-${Math.random().toString(36).slice(2, 7)}`,
    groupKey,
    userId: alert.userId,
    userName: alert.userName,
    resourceKey: alert.resourceKey,
    units: alert.units,
    points: calculatedPoints,
    team,
    timestamp: now,
    expiresAt: now + ALERT_TTL_MS,
  };

  const nextList = [...unexpired, newAlert];
  return nextList.length > MAX_VISIBLE_ALERTS
    ? nextList.slice(-MAX_VISIBLE_ALERTS)
    : nextList;
}

export const useOverlayStore = create<OverlayStoreState>((set, get) => ({
  projection: null,
  gameId: null,
  config: null,
  connected: false,
  alerts: [],
  celebration: null,

  setConnected: (connected: boolean) => set({ connected }),
  setConfig: (config: AxBConfig) => set({ config }),
  setGameId: (gameId: string) => set({ gameId }),

  applyProjection: (newProjection: AxBProjection): ApplyProjectionResult => {
    const state = get();
    const { celebration, triggered } = calculateNextCelebration(
      state.projection,
      newProjection,
      state.config,
      state.celebration,
    );
    set({ projection: newProjection, celebration });
    return { celebrationTriggered: triggered };
  },

  pushAlert: (alert: ContributionAlert, currentTime?: number) => {
    const now = currentTime ?? Date.now();
    const state = get();
    const nextAlerts = aggregateAlert(state.alerts, alert, state.config, now);
    set({ alerts: nextAlerts });
  },

  cleanupExpiredAlerts: (currentTime?: number) => {
    const now = currentTime ?? Date.now();
    const active = get().alerts.filter((a) => a.expiresAt > now);
    if (active.length !== get().alerts.length) {
      set({ alerts: active });
    }
  },

  clearCelebration: () => set({ celebration: null }),

  reset: () =>
    set({
      projection: null,
      gameId: null,
      config: null,
      connected: false,
      alerts: [],
      celebration: null,
    }),
}));
