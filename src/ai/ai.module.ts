import { Module } from '@nestjs/common'
import { AiHandlers } from '@/ai/ai-handlers'
import { AiResponseListener } from '@/ai/ai-response.listener'
import { AiTasks } from '@/ai/ai-tasks.service'
import { StubAiWorker } from '@/ai/dev/stub-ai.worker'

/** Sends tasks to the AI service and routes its responses back to the features. Depends on no feature. */
@Module({
  providers: [AiTasks, AiHandlers, AiResponseListener, StubAiWorker],
  exports: [AiTasks, AiHandlers],
})
export class AiModule { }
