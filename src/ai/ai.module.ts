import { Module } from '@nestjs/common'
import { StubAiClient } from '@/ai/clients/stub-ai.client'
import { AI_CLIENT } from '@/ai/interfaces/ai-client.interface'

/** Swap `useClass` for the HTTP client once the AI service is deployed; nothing that injects AI_CLIENT changes. */
@Module({
  providers: [{ provide: AI_CLIENT, useClass: StubAiClient }],
  exports: [AI_CLIENT],
})
export class AiModule { }
