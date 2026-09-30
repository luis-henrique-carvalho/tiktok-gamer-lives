import type { NormalizedInteraction } from './ingress.js';

export interface ExecutionContext {
  readonly timestamp: number;
  readonly isPaused: boolean;
}

export interface TimerRequest {
  readonly id: string;
  readonly delayMs: number;
  readonly type: string;
  readonly payload?: Record<string, unknown>;
}

export interface GameEvent {
  readonly type: string;
  readonly payload: Record<string, unknown>;
  readonly timestamp: number;
}

export interface DecisionResult<TState> {
  readonly nextState: TState;
  readonly status?: 'APPLIED' | 'DEFERRED' | 'IGNORED';
  readonly reason?: string;
  readonly events?: readonly GameEvent[];
  readonly timerRequests?: readonly TimerRequest[];
  readonly roundEnded?: boolean;
  readonly winnerTeamId?: string | null;
}

export interface ProjectionMeta {
  readonly isPaused: boolean;
  readonly pendingCount: number;
}

export interface GameInputMapper<TConfig = unknown, TCommand = unknown> {
  mapInteraction(
    interaction: NormalizedInteraction,
    config: TConfig,
  ): TCommand | null;
}

export interface GameEngine<
  TState = unknown,
  TConfig = unknown,
  TCommand = unknown,
> {
  createInitialState(config?: TConfig): TState;
  applyCommand(
    state: TState,
    command: TCommand,
    context: ExecutionContext,
    config?: TConfig,
  ): DecisionResult<TState>;
  validateConfig?(rawConfig: unknown): TConfig;
}

export interface GameProjection<
  TState = unknown,
  TConfig = unknown,
  TProjection = unknown,
> {
  project(state: TState, config: TConfig, meta: ProjectionMeta): TProjection;
}

export interface GameModule<
  TState = unknown,
  TConfig = unknown,
  TProjection = unknown,
  TCommand = unknown,
> {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly mapper: GameInputMapper<TConfig, TCommand>;
  readonly engine: GameEngine<TState, TConfig, TCommand>;
  readonly projection: GameProjection<TState, TConfig, TProjection>;
  validateConfig?(rawConfig: unknown): TConfig;
}
