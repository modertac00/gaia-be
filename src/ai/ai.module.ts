import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { AiHandlers } from '@/ai/ai-handlers'
import { AiResponseListener } from '@/ai/ai-response.listener'
import { AiTasks } from '@/ai/ai-tasks.service'
import { AiRunModel } from '@/ai/runs/ai-run.model'
import { AI_RUNS_REPOSITORY } from '@/ai/runs/ai-runs-repository.interface'
import { AiRunsRepository } from '@/ai/runs/ai-runs.repository'
import { AiRuns } from '@/ai/runs/ai-runs.service'

@Module({
  imports: [SequelizeModule.forFeature([AiRunModel])],
  providers: [AiTasks, AiHandlers, AiResponseListener, AiRuns, { provide: AI_RUNS_REPOSITORY, useClass: AiRunsRepository }],
  exports: [AiTasks, AiHandlers, AI_RUNS_REPOSITORY],
})
export class AiModule { }
