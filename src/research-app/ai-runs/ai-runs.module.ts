import { Module } from '@nestjs/common'
import { AiModule } from '@/ai/ai.module'
import { AiRunsController } from '@/research-app/ai-runs/ai-runs.controller'
import { AiRunsService } from '@/research-app/ai-runs/ai-runs.service'
import { ResearchModule } from '@/research-app/research/research.module'

@Module({
  imports: [AiModule, ResearchModule],
  controllers: [AiRunsController],
  providers: [AiRunsService],
})
export class AiRunsModule { }
