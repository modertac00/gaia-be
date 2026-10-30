import { Inject, Injectable, type OnModuleInit } from '@nestjs/common'
import { AI_RUN_KIND, type AiError, type SourceClassifiedResult } from '@moderta/api-contracts/gaia'
import { AiHandlers, type AiResponseHandler } from '@/ai/ai-handlers'
import { ResultNotReadyError } from '@/ai/result-not-ready'
import { AppLogger } from '@/log'
import { SOURCES_REPOSITORY } from '@/research-app/sources/interfaces/sources-repository.interface'
import { SourcesRepository } from '@/research-app/sources/repositories/sources.repository'

/** The AI classified one paper. classifiedBy stays empty because the column holds a user id, not the AI's name. */
@Injectable()
export class SourceClassifiedHandler implements AiResponseHandler<typeof AI_RUN_KIND.SOURCE_CLASSIFIED>, OnModuleInit {
  readonly kind = AI_RUN_KIND.SOURCE_CLASSIFIED

  constructor(
    @Inject(AiHandlers) private readonly handlers: AiHandlers,
    @Inject(SOURCES_REPOSITORY) private readonly repository: SourcesRepository,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) { }

  onModuleInit(): void {
    this.handlers.register(this)
  }

  async onSucceeded(taskId: string, result: SourceClassifiedResult): Promise<void> {
    const { researchId, paperId } = result

    const source = await this.repository.findById(researchId, paperId)
    if (!source) {
      const message = `Source classified ${taskId}: source ${paperId} is not saved yet, it will be retried`
      this.logger.warn(message, SourceClassifiedHandler.name)
      throw new ResultNotReadyError(message)
    }

    if (source.stance !== null) {
      this.logger.debug(`Source classified ${taskId}: source ${paperId} is already classified, left as it is`, SourceClassifiedHandler.name)
      return
    }

    await this.repository.saveAiStance(researchId, paperId, result.classification)
  }

  onFailed(taskId: string, error: AiError, researchId?: string): Promise<void> {
    const researchLabel = researchId ? researchId : 'unknown'
    this.logger.warn(`Source classified ${taskId} failed (${error.code}) for research ${researchLabel}`, SourceClassifiedHandler.name)
    return Promise.resolve()
  }
}
