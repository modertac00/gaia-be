import { Inject, Injectable, type OnModuleInit } from '@nestjs/common'
import { type ConfigType } from '@nestjs/config'
import { AI_MESSAGE_TYPE, AI_QUEUE_CHANNEL, aiResultSchemaByKind, aiTaskResponseSchema } from '@moderta/api-contracts/gaia'
import type { MessageBus } from '@moderta/api-contracts/queue'
import { queueConfig } from '@/config'
import { AiHandlers } from '@/ai/ai-handlers'
import { AiRuns } from '@/ai/runs/ai-runs.service'
import { MESSAGE_BUS } from '@/queue/queue.constants'


@Injectable()
export class AiResponseListener implements OnModuleInit {
  constructor(
    @Inject(MESSAGE_BUS) private readonly bus: MessageBus,
    @Inject(queueConfig.KEY) private readonly config: ConfigType<typeof queueConfig>,
    @Inject(AiHandlers) private readonly handlers: AiHandlers,
    @Inject(AiRuns) private readonly runs: AiRuns,
  ) { }

  onModuleInit(): void {
    if (!this.config.consumersEnabled) return

    this.bus.subscribe(AI_QUEUE_CHANNEL.STATUS, async (message) => {
      if (message.type !== AI_MESSAGE_TYPE.TASK_STATUS) throw new Error(`Unexpected message type "${message.type}"`)

      const response = aiTaskResponseSchema.safeParse(message.payload)
      if (!response.success) throw new Error(`Unreadable AI response ${message.messageId}: ${response.error.message}`)

      const { kind, taskId, researchId, status, error } = response.data
      const handler = this.handlers.get(kind)
      if (!handler) throw new Error(`No handler is registered for AI tasks of kind "${kind}"`)

      if (status === 'failed') {
        const failure = error ?? { code: 'UNKNOWN', message: 'The AI task failed' }
        await handler.onFailed(taskId, failure, researchId)
        await this.runs.recordFailed(taskId, kind, researchId, failure)
        return
      }

      const result = aiResultSchemaByKind[kind].safeParse(response.data.result)
      if (!result.success) {
        const failure = { code: 'INVALID_RESULT', message: `The result does not match the ${kind} contract` }
        await handler.onFailed(taskId, failure, researchId)
        await this.runs.recordFailed(taskId, kind, researchId, failure)
        return
      }

      await handler.onSucceeded(taskId, result.data)
      await this.runs.recordSucceeded(taskId, kind, researchId ?? this.findResearchId(result.data), result.data)
    })
  }

  private findResearchId(result: unknown): string | undefined {
    if (typeof result !== 'object' || result === null || !('researchId' in result)) return undefined
    return typeof result.researchId === 'string' ? result.researchId : undefined
  }
}
