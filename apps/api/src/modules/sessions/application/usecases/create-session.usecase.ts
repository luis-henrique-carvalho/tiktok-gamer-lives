import type { SessionRepository } from '../repositories/session.repository.js';
import type { GameRegistry } from '../../../../common/registry/game-registry.js';
import { NotFoundError } from '../../../../common/domain/errors/not-found-error.js';
import {
  type GameSession,
  type CreateSessionInput,
  SessionStatus,
} from '../../domain/session.types.js';

export class CreateSessionUseCase {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly gameRegistry: GameRegistry,
  ) {}

  async execute(input: CreateSessionInput): Promise<GameSession> {
    if (!this.gameRegistry.hasGame(input.gameId)) {
      throw new NotFoundError(
        `Game with id "${input.gameId}" not found in registry`,
      );
    }

    const game = this.gameRegistry.getGame(input.gameId);
    let validatedConfig = input.config ?? {};
    if (game.validateConfig && input.config) {
      validatedConfig = game.validateConfig(input.config) as Record<
        string,
        unknown
      >;
    }

    return this.sessionRepository.create({
      ...input,
      config: validatedConfig,
      status: input.status ?? SessionStatus.CONFIGURING,
    });
  }
}
