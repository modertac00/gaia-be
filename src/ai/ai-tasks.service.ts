import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common'
import {
  AI_MESSAGE_TYPE,
  AI_QUEUE_CHANNEL,
  AI_RUN_STATUS,
  AI_SERVICE_UNAVAILABLE_MESSAGE,
  type AiRunRef,
  type AiTaskPayload,
  aiTaskPayloadSchema,
} from '@moderta/api-contracts/gaia'
import type { MessageBus } from '@moderta/api-contracts/queue'
import { AppLogger } from '@/log'
import { AiRuns } from '@/ai/runs/ai-runs.service'
import { KINDS_WITHOUT_RESEARCH } from '@/ai/runs/run-resources'
import { MESSAGE_BUS } from '@/queue/queue.constants'

const CONTEXT = 'AiTasks'

@Injectable()
export class AiTasks {
  constructor(
    @Inject(MESSAGE_BUS) private readonly bus: MessageBus,
    @Inject(AppLogger) private readonly logger: AppLogger,
    @Inject(AiRuns) private readonly runs: AiRuns,
  ) { }

  async send(task: AiTaskPayload, researchId?: string): Promise<AiRunRef> {
    const payload = aiTaskPayloadSchema.parse(task)

    try {
      await this.bus.publish(AI_QUEUE_CHANNEL.TASKS, { type: AI_MESSAGE_TYPE.TASK_REQUESTED, correlationId: payload.taskId, payload })
    } catch (error) {
      throw new ServiceUnavailableException(AI_SERVICE_UNAVAILABLE_MESSAGE, { cause: error })
    }

    if (KINDS_WITHOUT_RESEARCH.has(payload.kind)) return { id: payload.taskId, kind: payload.kind, status: AI_RUN_STATUS.QUEUED }

    const runResearchId = researchId ?? ('researchId' in payload.input ? payload.input.researchId : undefined)
    if (runResearchId) {
      await this.runs.recordQueued(runResearchId, payload)
    } else {
      this.logger.warn(`AI task ${payload.taskId} (${payload.kind}) was not logged: no researchId`, CONTEXT)
    }

    return { id: payload.taskId, kind: payload.kind, status: AI_RUN_STATUS.QUEUED }
  }
}
