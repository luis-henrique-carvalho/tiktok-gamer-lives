import { create } from 'zustand';
import type {
  GameSession,
  GameSnapshot,
  ContributionAlert,
  TikTokStatusResponse,
  LogEvent,
  MetricsState,
} from '@/api/types';

const MAX_LOG_CAPACITY = 100;

export interface DashboardState {
  readonly session: GameSession | null;
  readonly snapshot: GameSnapshot | null;
  readonly activeAlerts: readonly ContributionAlert[];
  readonly tiktokStatus: TikTokStatusResponse;
  readonly eventsLog: readonly LogEvent[];
  readonly metrics: MetricsState;
  readonly isConnected: boolean;
  readonly isLoading: boolean;
  readonly error: string | null;

  // Actions
  setSession: (session: GameSession | null) => void;
  updateSnapshot: (snapshot: GameSnapshot) => void;
  addAlert: (alert: ContributionAlert) => void;
  dismissAlert: (idOrIndex: string | number) => void;
  setTikTokStatus: (status: TikTokStatusResponse) => void;
  addLogEvent: (
    event: Omit<LogEvent, 'id' | 'timestamp'> & {
      readonly id?: string;
      readonly timestamp?: number;
    },
  ) => void;
  clearLog: () => void;
  updateMetrics: (metrics: Partial<MetricsState>) => void;
  setConnected: (connected: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialMetrics: MetricsState = {
  eventsCount: 0,
  eventsPerSecond: 0,
  snapshotsPerSecond: 0,
  latencyMs: 0,
  sequence: 0,
};

const initialTikTokStatus: TikTokStatusResponse = {
  status: 'disconnected',
  username: null,
  sessionId: null,
};

const initialState = {
  session: null,
  snapshot: null,
  activeAlerts: [] as readonly ContributionAlert[],
  tiktokStatus: initialTikTokStatus,
  eventsLog: [] as readonly LogEvent[],
  metrics: initialMetrics,
  isConnected: false,
  isLoading: false,
  error: null,
};

function handleAddAlert(
  state: DashboardState,
  alert: ContributionAlert,
): Partial<DashboardState> {
  const alertId =
    alert.id ?? `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const fullAlert: ContributionAlert = { ...alert, id: alertId };
  const logItem: LogEvent = {
    id: `log-${alertId}`,
    timestamp: alert.timestamp || Date.now(),
    type: 'alert',
    text: `${alert.userName} enviou ${alert.units}x ${alert.resourceKey}!`,
    details: { alert: fullAlert },
  };

  return {
    activeAlerts: [...state.activeAlerts, fullAlert],
    eventsLog: [logItem, ...state.eventsLog].slice(0, MAX_LOG_CAPACITY),
    metrics: {
      ...state.metrics,
      eventsCount: state.metrics.eventsCount + 1,
    },
  };
}

function handleAddLog(
  state: DashboardState,
  event: Omit<LogEvent, 'id' | 'timestamp'> & {
    readonly id?: string;
    readonly timestamp?: number;
  },
): Partial<DashboardState> {
  const id =
    event.id ?? `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const timestamp = event.timestamp ?? Date.now();
  const newEvent: LogEvent = { ...event, id, timestamp };

  return {
    eventsLog: [newEvent, ...state.eventsLog].slice(0, MAX_LOG_CAPACITY),
    metrics: {
      ...state.metrics,
      eventsCount: state.metrics.eventsCount + 1,
    },
  };
}

export const useDashboardStore = create<DashboardState>((set) => ({
  ...initialState,
  setSession: (session) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (session?.id) {
        window.localStorage.setItem('active_session_id', session.id);
      } else {
        window.localStorage.removeItem('active_session_id');
      }
    }
    set({ session });
  },
  updateSnapshot: (snapshot) =>
    set((state) => ({
      snapshot,
      metrics: { ...state.metrics, sequence: snapshot.sequence },
    })),
  addAlert: (alert) => set((state) => handleAddAlert(state, alert)),
  dismissAlert: (idOrIndex) =>
    set((state) => ({
      activeAlerts: state.activeAlerts.filter((a, index) =>
        typeof idOrIndex === 'number'
          ? index !== idOrIndex
          : a.id !== idOrIndex,
      ),
    })),
  setTikTokStatus: (tiktokStatus) => set({ tiktokStatus }),
  addLogEvent: (event) => set((state) => handleAddLog(state, event)),
  clearLog: () => set({ eventsLog: [] }),
  updateMetrics: (partial) =>
    set((state) => ({ metrics: { ...state.metrics, ...partial } })),
  setConnected: (isConnected) => set({ isConnected }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
