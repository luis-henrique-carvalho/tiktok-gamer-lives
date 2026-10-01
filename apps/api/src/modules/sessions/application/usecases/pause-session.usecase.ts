import type { SessionRepository } from '../repositories/session.repository.js';
import { NotFoundError } from '../../../../common/domain/errors/not-found-error.js';
import { BadRequestError } from '../../../../common/domain/errors/bad-request-error.js';
import { type GameSession, SessionStatus } from '../../domain/session.types.js';

export interface PauseSessionInput {
  sessionId: string;
}

export class PauseSessionUseCase {
  constructor(private readonly sessionRepository: SessionRepository) {}

  async execute(input: PauseSessionInput): Promise<GameSession> {
    const session = await this.sessionRepository.findById(input.sessionId);
    if (!session) {
      throw new NotFoundError(
        `Session with id "${input.sessionId}" was not found`,
      );
    }

    if (session.status !== SessionStatus.RUNNING) {
      throw new BadRequestError(
        `Cannot pause session with status "${session.status}"`,
      );
    }

    const updatedSession = await this.sessionRepository.updateStatus(
      session.id,
      SessionStatus.PAUSED,
    );

    if (!updatedSession) {
      throw new NotFoundError(
        `Failed to pause session with id "${input.sessionId}"`,
      );
    }

    return updatedSession;
  }
}
