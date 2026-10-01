import type { CreateSessionUseCase } from '../../../application/usecases/create-session.usecase.js';
import type { StartSessionUseCase } from '../../../application/usecases/start-session.usecase.js';
import type { PauseSessionUseCase } from '../../../application/usecases/pause-session.usecase.js';
import type { ResumeSessionUseCase } from '../../../application/usecases/resume-session.usecase.js';
import type { EndSessionUseCase } from '../../../application/usecases/end-session.usecase.js';
import type { SessionRepository } from '../../../application/repositories/session.repository.js';
import type { SnapshotRepository } from '../../../application/repositories/snapshot.repository.js';
import type { InteractionRepository } from '../../../application/repositories/interaction.repository.js';
import { NotFoundError } from '../../../../../common/domain/errors/not-found-error.js';
import {
  createSessionSchema,
  sessionIdParamSchema,
} from '../dtos/session.dto.js';

export class SessionController {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly snapshotRepository: SnapshotRepository,
    private readonly interactionRepository: InteractionRepository,
    private readonly createSessionUseCase: CreateSessionUseCase,
    private readonly startSessionUseCase: StartSessionUseCase,
    private readonly pauseSessionUseCase: PauseSessionUseCase,
    private readonly resumeSessionUseCase: ResumeSessionUseCase,
    private readonly endSessionUseCase: EndSessionUseCase,
  ) {}

  async create(body: unknown) {
    const validated = createSessionSchema.parse(body);
    const session = await this.createSessionUseCase.execute(validated);
    return session;
  }

  async getById(idParam: unknown) {
    const { id } = sessionIdParamSchema.parse({ id: idParam });
    const session = await this.sessionRepository.findById(id);
    if (!session) {
      throw new NotFoundError(`Session with id "${id}" was not found`);
    }
    return session;
  }

  async start(idParam: unknown) {
    const { id } = sessionIdParamSchema.parse({ id: idParam });
    return this.startSessionUseCase.execute({ sessionId: id });
  }

  async pause(idParam: unknown) {
    const { id } = sessionIdParamSchema.parse({ id: idParam });
    return this.pauseSessionUseCase.execute({ sessionId: id });
  }

  async resume(idParam: unknown) {
    const { id } = sessionIdParamSchema.parse({ id: idParam });
    return this.resumeSessionUseCase.execute({ sessionId: id });
  }

  async end(idParam: unknown) {
    const { id } = sessionIdParamSchema.parse({ id: idParam });
    return this.endSessionUseCase.execute({ sessionId: id });
  }

  async audit(idParam: unknown) {
    const { id } = sessionIdParamSchema.parse({ id: idParam });
    const session = await this.sessionRepository.findById(id);
    if (!session) {
      throw new NotFoundError(`Session with id "${id}" was not found`);
    }

    const latestSnapshot =
      await this.snapshotRepository.findLatestBySessionId(id);
    const pendingInteractions =
      await this.interactionRepository.findPendingBySessionId(id);

    return {
      session,
      latestSnapshot,
      pendingInteractionsCount: pendingInteractions.length,
      pendingInteractions,
    };
  }
}
