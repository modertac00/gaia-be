import { Inject, Injectable, type OnModuleInit } from '@nestjs/common'
import { type ConfigType } from '@nestjs/config'
import { AI_MESSAGE_TYPE, AI_QUEUE_CHANNEL, aiTaskPayloadSchema } from '@moderta/api-contracts/gaia'
import type { MessageBus } from '@moderta/api-contracts/queue'
import { queueConfig } from '@/config'
import { stubSourceAnswer } from '@/ai/dev/stub-answers'
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

      await sleep(ANSWER_DELAY_MS)
      await this.bus.publish(AI_QUEUE_CHANNEL.STATUS, {
        type: AI_MESSAGE_TYPE.TASK_STATUS,
        correlationId: task.taskId,
        payload: { kind: task.kind, taskId: task.taskId, status: 'succeeded', result: stubSourceAnswer(task.input) },
      })
    })
  }
}
