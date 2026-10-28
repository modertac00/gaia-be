import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { AiModule } from '@/ai/ai.module'
import { ResearchModule } from '@/research/research.module'
import { SOURCES_REPOSITORY } from '@/sources/interfaces/sources-repository.interface'
import { ReadingListEntryModel } from '@/sources/models/reading-list-entry.model'
import { SourceChatModel } from '@/sources/models/source-chat.model'
import { SourceClassificationHistoryModel } from '@/sources/models/source-classification-history.model'
import { SourceLinkModel } from '@/sources/models/source-link.model'
import { SourceScreeningModel } from '@/sources/models/source-screening.model'
import { SourceModel } from '@/sources/models/source.model'
import { SourcesRepository } from '@/sources/repositories/sources.repository'
import { SourcesService } from '@/sources/services/sources.service'
import { SourcesController } from '@/sources/sources.controller'

@Module({
  imports: [
    AiModule,
    ResearchModule,
    SequelizeModule.forFeature([
      SourceModel,
      SourceClassificationHistoryModel,
      SourceScreeningModel,
      SourceChatModel,
      SourceLinkModel,
      ReadingListEntryModel,
    ]),
  ],
  controllers: [SourcesController],
  providers: [SourcesService, { provide: SOURCES_REPOSITORY, useClass: SourcesRepository }],
})
export class SourcesModule { }
