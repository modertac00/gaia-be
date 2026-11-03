import { Global, Module } from '@nestjs/common'
import { ResearchEvents } from '@/realtime/research-events.service'
import { ResearchGateway } from '@/realtime/research.gateway'
import { ResearchModule } from '@/research-app/research/research.module'

// Global so src/ai can inject ResearchEvents without importing this module
// (this module imports ResearchModule, which imports AiModule: a normal import would be circular).
@Global()
@Module({
  imports: [ResearchModule],
  providers: [ResearchGateway, ResearchEvents],
  exports: [ResearchEvents],
})
export class RealtimeModule { }
