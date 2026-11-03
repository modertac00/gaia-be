import { Inject, Injectable, type OnModuleInit } from '@nestjs/common'
import { AI_RUN_KIND, type SourceQuestionAnswer } from '@moderta/api-contracts/gaia'
import { AiHandlers, type AiResponseHandler } from '@/ai/ai-handlers'
import { SOURCES_REPOSITORY } from '@/research-app/sources/interfaces/sources-repository.interface'
import { SourcesRepository } from '@/research-app/sources/repositories/sources.repository'

@Injectable()
export class SourceQuestionHandler implements AiResponseHandler<typeof AI_RUN_KIND.SOURCE_QUESTION>, OnModuleInit {
  readonly kind = AI_RUN_KIND.SOURCE_QUESTION

  constructor(
    @Inject(AiHandlers) private readonly handlers: AiHandlers,
    @Inject(SOURCES_REPOSITORY) private readonly repository: SourcesRepository,
  ) { }

  onModuleInit(): void {
    this.handlers.register(this)
  }

  onSucceeded(questionId: string, result: SourceQuestionAnswer): Promise<void> {
    return this.repository.answerQuestion(questionId, result)
  }

  onFailed(questionId: string): Promise<void> {
    return this.repository.failQuestion(questionId)
  }
}
