import type { SessionRepository } from '../../../../modules/sessions/application/repositories/session.repository.js';
import type { SnapshotRepository } from '../../../../modules/sessions/application/repositories/snapshot.repository.js';
import type { GameSnapshot } from '../../../../modules/sessions/domain/session.types.js';
import { SessionStatus } from '../../../../modules/sessions/domain/session.types.js';
import type { GameRegistry } from '../../../registry/game-registry.js';
import type {
  DecisionResult,
  ExecutionContext,
  ProjectionMeta,
} from '../../../../contracts/engine.js';
import type { DeclarativeTimerService } from '../../../timers/declarative-timer.service.js';
import { NotFoundError } from '../../../domain/errors/not-found-error.js';

export interface ProcessGameCommandInput {
  sessionId: string;
  gameId: string;
  command: unknown;
  timestamp?: number;
}

export interface ProcessGameCommandResult {
  snapshot?: GameSnapshot;
  decision?: DecisionResult<unknown>;
  projection?: unknown;
  ignored?: boolean;
  reason?: string;
}

export class ProcessGameCommandUseCase {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly snapshotRepository: SnapshotRepository,
    private readonly gameRegistry: GameRegistry,
    private readonly timerService?: DeclarativeTimerService,
  ) {}

  async execute(
    input: ProcessGameCommandInput,
  ): Promise<ProcessGameCommandResult> {
    const session = await this.sessionRepository.findById(input.sessionId);
    if (!session) {
      throw new NotFoundError(
        `Session with id "${input.sessionId}" was not found`,
      );
    }

    if (session.status === SessionStatus.ENDED) {
      return { ignored: true, reason: 'SESSION_ENDED' };
    }

    const game = this.gameRegistry.getGame(input.gameId);
    const latestSnapshot = await this.snapshotRepository.findLatestBySessionId(
      input.sessionId,
    );

    let currentState: unknown;
    let lastSequence: number;

    if (latestSnapshot) {
      currentState = latestSnapshot.state;
      lastSequence = latestSnapshot.sequence;
    } else {
      currentState = game.engine.createInitialState(session.config);
      lastSequence = 0;
    }

    const context: ExecutionContext = {
      timestamp: input.timestamp ?? Date.now(),
      isPaused: session.status === SessionStatus.PAUSED,
    };

    const decisionResult = game.engine.applyCommand(
      currentState,
      input.command,
      context,
      session.config,
    );

    const pendingCount =
      (decisionResult.nextState as { pendingContributions?: unknown[] })
        ?.pendingContributions?.length ?? 0;

    const meta: ProjectionMeta = {
      isPaused: session.status === SessionStatus.PAUSED,
      pendingCount,
    };

    const projection = game.projection.project(
      decisionResult.nextState,
      session.config,
      meta,
    );

    const newSequence = lastSequence + 1;
    const newSnapshot = await this.snapshotRepository.save({
      sessionId: session.id,
      gameId: session.gameId,
      sequence: newSequence,
      state: decisionResult.nextState,
      projection,
    });

    if (
      this.timerService &&
      decisionResult.timerRequests &&
      decisionResult.timerRequests.length > 0
    ) {
      for (const timer of decisionResult.timerRequests) {
        await this.timerService.scheduleTimer({
          sessionId: session.id,
          gameId: session.gameId,
          timer,
        });
      }
    }

    return {
      snapshot: newSnapshot,
      decision: decisionResult,
      projection,
    };
  }
}
