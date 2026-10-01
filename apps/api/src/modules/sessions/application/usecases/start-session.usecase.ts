import type { SessionRepository } from '../repositories/session.repository.js';
import type { SnapshotRepository } from '../repositories/snapshot.repository.js';
import type { GameRegistry } from '../../../../common/registry/game-registry.js';
import { NotFoundError } from '../../../../common/domain/errors/not-found-error.js';
import { BadRequestError } from '../../../../common/domain/errors/bad-request-error.js';
import { type GameSession, SessionStatus } from '../../domain/session.types.js';

export interface StartSessionInput {
  sessionId: string;
}

export class StartSessionUseCase {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly snapshotRepository: SnapshotRepository,
    private readonly gameRegistry: GameRegistry,
  ) {}

  async execute(input: StartSessionInput): Promise<GameSession> {
    const session = await this.sessionRepository.findById(input.sessionId);
    if (!session) {
      throw new NotFoundError(
        `Session with id "${input.sessionId}" was not found`,
      );
    }

    if (
      session.status !== SessionStatus.CONFIGURING &&
      session.status !== SessionStatus.PAUSED
    ) {
      throw new BadRequestError(
        `Cannot start session in status "${session.status}"`,
      );
    }

    const updatedSession = await this.sessionRepository.updateStatus(
      session.id,
      SessionStatus.RUNNING,
    );

    if (!updatedSession) {
      throw new NotFoundError(
        `Failed to update session with id "${input.sessionId}"`,
      );
    }

    const existingSnapshot =
      await this.snapshotRepository.findLatestBySessionId(session.id);
    if (!existingSnapshot) {
      const game = this.gameRegistry.getGame(session.gameId);
      const initialState = game.engine.createInitialState(session.config);
      const initialProjection = game.projection.project(
        initialState,
        session.config,
        { isPaused: false, pendingCount: 0 },
      );

      await this.snapshotRepository.save({
        sessionId: session.id,
        gameId: session.gameId,
        sequence: 0,
        state: initialState,
        projection: initialProjection,
      });
    }

    return updatedSession;
  }
}
