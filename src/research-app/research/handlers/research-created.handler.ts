import { Inject, Injectable, type OnModuleInit } from '@nestjs/common'
import { AI_RUN_KIND, type AiError, type ResearchCreatedResult } from '@moderta/api-contracts/gaia'
import { AiHandlers, type AiResponseHandler } from '@/ai/ai-handlers'
import { AppLogger } from '@/log'
import { RESEARCH_REPOSITORY } from '@/research-app/research/interfaces/research-repository.interface'
import { ResearchRepository } from '@/research-app/research/repositories/research.repository'

@Injectable()
export class ResearchCreatedHandler implements AiResponseHandler<typeof AI_RUN_KIND.RESEARCH_CREATED>, OnModuleInit {
  readonly kind = AI_RUN_KIND.RESEARCH_CREATED

  constructor(
    @Inject(AiHandlers) private readonly handlers: AiHandlers,
    @Inject(RESEARCH_REPOSITORY) private readonly repository: ResearchRepository,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) { }

  onModuleInit(): void {
    this.handlers.register(this)
  }

  onSucceeded(taskId: string, result: ResearchCreatedResult): Promise<void> {
    return this.repository.saveScreeningCounts(result.researchId, result.screeningCounts)
  }

  async onFailed(taskId: string, error: AiError): Promise<void> {
    this.logger.warn(`research_created task ${taskId} failed with code ${error.code}`, ResearchCreatedHandler.name)
  }
}
