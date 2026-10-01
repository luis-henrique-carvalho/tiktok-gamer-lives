import type { SessionRepository } from '../repositories/session.repository.js';
import { NotFoundError } from '../../../../common/domain/errors/not-found-error.js';
import { BadRequestError } from '../../../../common/domain/errors/bad-request-error.js';
import { type GameSession, SessionStatus } from '../../domain/session.types.js';

export interface EndSessionInput {
  sessionId: string;
}

export class EndSessionUseCase {
  constructor(private readonly sessionRepository: SessionRepository) {}

  async execute(input: EndSessionInput): Promise<GameSession> {
    const session = await this.sessionRepository.findById(input.sessionId);
    if (!session) {
      throw new NotFoundError(
        `Session with id "${input.sessionId}" was not found`,
      );
    }

    if (session.status === SessionStatus.ENDED) {
      throw new BadRequestError('Session is already ended');
    }

    const endedAt = new Date();
    const updatedSession = await this.sessionRepository.updateStatus(
      session.id,
      SessionStatus.ENDED,
      endedAt,
    );

    if (!updatedSession) {
      throw new NotFoundError(
        `Failed to end session with id "${input.sessionId}"`,
      );
    }

    return updatedSession;
  }
}
