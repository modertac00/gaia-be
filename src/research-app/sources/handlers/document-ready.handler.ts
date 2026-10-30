import { Inject, Injectable, type OnModuleInit } from '@nestjs/common'
import { AI_RUN_KIND, type AiError, type DocumentReadyResult } from '@moderta/api-contracts/gaia'
import { AiHandlers, type AiResponseHandler } from '@/ai/ai-handlers'
import { ResultNotReadyError } from '@/ai/result-not-ready'
import { AppLogger } from '@/log'
import { SOURCES_REPOSITORY } from '@/research-app/sources/interfaces/sources-repository.interface'
import { SourcesRepository } from '@/research-app/sources/repositories/sources.repository'

/** The AI read the document of one paper: store its summary and mark the source resolved. */
@Injectable()
export class DocumentReadyHandler implements AiResponseHandler<typeof AI_RUN_KIND.DOCUMENT_READY>, OnModuleInit {
  readonly kind = AI_RUN_KIND.DOCUMENT_READY

  constructor(
    @Inject(AiHandlers) private readonly handlers: AiHandlers,
    @Inject(SOURCES_REPOSITORY) private readonly repository: SourcesRepository,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) { }

  onModuleInit(): void {
    this.handlers.register(this)
  }

  async onSucceeded(taskId: string, result: DocumentReadyResult): Promise<void> {
    const found = await this.repository.saveDocumentReady(result.researchId, result.paperId, result.summary)
    if (found) {
      return
    }

    const message = `Document ready ${taskId}: source ${result.paperId} is not saved yet, it will be retried`
    this.logger.warn(message, DocumentReadyHandler.name)
    throw new ResultNotReadyError(message)
  }

  onFailed(taskId: string, error: AiError, researchId?: string): Promise<void> {
    const researchLabel = researchId ? researchId : 'unknown'
    this.logger.warn(`Document ready ${taskId} failed (${error.code}) for research ${researchLabel}`, DocumentReadyHandler.name)
    return Promise.resolve()
  }
}
