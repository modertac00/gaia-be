import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { AiModule } from '@/ai/ai.module'
import { AuditModule } from '@/research-app/audit/audit.module'
import { ResearchModule } from '@/research-app/research/research.module'
import { SourceQuestionHandler } from '@/research-app/sources/handlers/source-question.handler'
import { SOURCES_REPOSITORY } from '@/research-app/sources/interfaces/sources-repository.interface'
import { SourceChatModel } from '@/research-app/sources/models/source-chat.model'
import { SourceClassificationHistoryModel } from '@/research-app/sources/models/source-classification-history.model'
import { SourceScreeningModel } from '@/research-app/sources/models/source-screening.model'
import { SourceModel } from '@/research-app/sources/models/source.model'
import { SourcesRepository } from '@/research-app/sources/repositories/sources.repository'
import { SourcesService } from '@/research-app/sources/services/sources.service'
import { SourcesController } from '@/research-app/sources/sources.controller'

@Module({
  imports: [
    AiModule,
    AuditModule,
    ResearchModule,
    SequelizeModule.forFeature([
      SourceModel,
      SourceClassificationHistoryModel,
      SourceScreeningModel,
      SourceChatModel,
    ]),
  ],
  controllers: [SourcesController],
  providers: [SourcesService, SourceQuestionHandler, { provide: SOURCES_REPOSITORY, useClass: SourcesRepository }],
})
export class SourcesModule { }
