import { Inject, Injectable, type OnModuleInit } from '@nestjs/common'
import { type ConfigType } from '@nestjs/config'
import { AI_MESSAGE_TYPE, AI_QUEUE_CHANNEL, AI_RUN_KIND, aiTaskPayloadSchema, type AiRunKind } from '@moderta/api-contracts/gaia'
import type { MessageBus } from '@moderta/api-contracts/queue'
import { queueConfig } from '@/config'
import { stubNoteSectionEdit, stubSourceAnswer } from '@/ai/dev/stub-answers'
import { AppLogger } from '@/log'
import { MESSAGE_BUS } from '@/queue/queue.constants'

const ANSWER_DELAY_MS = 500
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

@Injectable()
export class StubAiWorker implements OnModuleInit {
  constructor(
    @Inject(MESSAGE_BUS) private readonly bus: MessageBus,
    @Inject(queueConfig.KEY) private readonly config: ConfigType<typeof queueConfig>,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) { }

  onModuleInit(): void {
    if (this.config.driver !== 'memory') return

    this.logger.warn('AI service is not connected: AI tasks are answered by a stub worker', StubAiWorker.name)
    this.bus.subscribe(AI_QUEUE_CHANNEL.TASKS, async (message) => {
      const task = aiTaskPayloadSchema.parse(message.payload)

      if (task.kind === AI_RUN_KIND.SOURCE_QUESTION) {
        await this.answer(task.kind, task.taskId, stubSourceAnswer(task.input))
        return
      }

      if (task.kind === AI_RUN_KIND.NOTE_SECTION_EDIT) {
        await this.answer(task.kind, task.taskId, stubNoteSectionEdit(task.input))
        return
      }

      this.logger.warn(`The stub worker does not answer "${task.kind}" tasks`, StubAiWorker.name)
    })
  }

  private async answer(kind: AiRunKind, taskId: string, result: unknown): Promise<void> {
    await sleep(ANSWER_DELAY_MS)
    await this.bus.publish(AI_QUEUE_CHANNEL.STATUS, {
      type: AI_MESSAGE_TYPE.TASK_STATUS,
      correlationId: taskId,
      payload: { kind, taskId, status: 'succeeded', result },
    })
  }
}
