import { Inject, Injectable, type OnModuleInit } from '@nestjs/common'
import { AI_RUN_KIND, CLARIFICATION_FAILED_MESSAGE, type AiError, type ClarificationResult } from '@moderta/api-contracts/gaia'
import { AiHandlers, type AiResponseHandler } from '@/ai/ai-handlers'
import { AppLogger } from '@/log'
import { CLARIFICATIONS_REPOSITORY } from '@/research-app/clarifications/interfaces/clarifications-repository.interface'
import { ClarificationsRepository } from '@/research-app/clarifications/repositories/clarifications.repository'

@Injectable()
export class ClarificationHandler implements AiResponseHandler<typeof AI_RUN_KIND.CLARIFICATION>, OnModuleInit {
  readonly kind = AI_RUN_KIND.CLARIFICATION

  constructor(
    @Inject(AiHandlers) private readonly handlers: AiHandlers,
    @Inject(CLARIFICATIONS_REPOSITORY) private readonly repository: ClarificationsRepository,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) { }

  onModuleInit(): void {
    this.handlers.register(this)
  }

  async onSucceeded(taskId: string, result: ClarificationResult): Promise<void> {
    const saved = await this.repository.saveReady(taskId, result)
    if (!saved) this.logger.warn(`Clarification ${taskId} not found, result ignored`, ClarificationHandler.name)
  }

  async onFailed(taskId: string, error: AiError): Promise<void> {
    const failure = { code: error.code, message: error.message || CLARIFICATION_FAILED_MESSAGE }
    const saved = await this.repository.saveFailed(taskId, failure)
    if (!saved) this.logger.warn(`Clarification ${taskId} not found, failure ignored`, ClarificationHandler.name)
  }
}
