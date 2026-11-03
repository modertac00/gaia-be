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
import { MESSAGE_BUS } from '@/queue/queue.constants'

const CONTEXT = 'AiTasks'

@Injectable()
export class AiTasks {
  constructor(
    @Inject(MESSAGE_BUS) private readonly bus: MessageBus,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) { }

  async send(task: AiTaskPayload): Promise<AiRunRef> {
    const payload = aiTaskPayloadSchema.parse(task)

    try {
      await this.bus.publish(AI_QUEUE_CHANNEL.TASKS, { type: AI_MESSAGE_TYPE.TASK_REQUESTED, correlationId: payload.taskId, payload })
    } catch (error) {
      this.logger.error(`Could not send AI task ${payload.taskId}: ${String(error)}`, error instanceof Error ? error.stack : undefined, CONTEXT)
      throw new ServiceUnavailableException(AI_SERVICE_UNAVAILABLE_MESSAGE)
    }

    return { id: payload.taskId, kind: payload.kind, status: AI_RUN_STATUS.QUEUED }
  }
}
