import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { AiModule } from '@/ai/ai.module'
import { RelatedPapersHandler } from '@/research-app/related/handlers/related-papers.handler'
import { RELATED_REPOSITORY } from '@/research-app/related/interfaces/related-repository.interface'
import { ReadingListEntryModel } from '@/research-app/related/models/reading-list-entry.model'
import { SourceLinkModel } from '@/research-app/related/models/source-link.model'
import { RelatedController } from '@/research-app/related/related.controller'
import { RelatedRepository } from '@/research-app/related/repositories/related.repository'
import { RelatedService } from '@/research-app/related/services/related.service'
import { ResearchModel } from '@/research-app/research/models/research.model'
import { ResearchModule } from '@/research-app/research/research.module'
import { SourceModel } from '@/research-app/sources/models/source.model'

@Module({
  imports: [
    AiModule,
    ResearchModule,
    SequelizeModule.forFeature([SourceLinkModel, ReadingListEntryModel, ResearchModel, SourceModel]),
  ],
  controllers: [RelatedController],
  providers: [RelatedService, RelatedPapersHandler, { provide: RELATED_REPOSITORY, useClass: RelatedRepository }],
})
export class RelatedModule { }
