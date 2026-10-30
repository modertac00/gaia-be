import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  AI_RUN_KIND,
  CLARIFICATION_NOT_FOUND_MESSAGE,
  type ClarificationDraft,
  type RequestClarificationDto,
} from '@moderta/api-contracts/gaia'
import { AiTasks } from '@/ai/ai-tasks.service'
import { CLARIFICATIONS_REPOSITORY } from '@/research-app/clarifications/interfaces/clarifications-repository.interface'
import { ClarificationsRepository } from '@/research-app/clarifications/repositories/clarifications.repository'
import { toClarificationDraft, toClarificationTaskInput } from '@/research-app/clarifications/utils/clarification-mapper'

@Injectable()
export class ClarificationsService {
  constructor(
    @Inject(CLARIFICATIONS_REPOSITORY) private readonly repository: ClarificationsRepository,
    @Inject(AiTasks) private readonly ai: AiTasks,
  ) { }

  async request(userId: string, brief: RequestClarificationDto): Promise<ClarificationDraft> {
    const clarification = await this.repository.createPending(userId, brief)

    try {
      await this.ai.send({
        kind: AI_RUN_KIND.CLARIFICATION,
        taskId: clarification.id,
        input: toClarificationTaskInput(clarification.id, brief),
      })
    } catch (error) {
      await this.repository.delete(clarification.id)
      throw error
    }

    return toClarificationDraft(clarification)
  }

  async get(userId: string, clarificationId: string): Promise<ClarificationDraft> {
    const clarification = await this.repository.findOwned(userId, clarificationId)
    if (!clarification) throw new NotFoundException(CLARIFICATION_NOT_FOUND_MESSAGE)

    return toClarificationDraft(clarification)
  }
}
