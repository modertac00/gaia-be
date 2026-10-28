import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { ReadingListEntryModel } from '@/sources/models/reading-list-entry.model'
import { SourceChatModel } from '@/sources/models/source-chat.model'
import { SourceClassificationHistoryModel } from '@/sources/models/source-classification-history.model'
import { SourceLinkModel } from '@/sources/models/source-link.model'
import { SourceScreeningModel } from '@/sources/models/source-screening.model'
import { SourceModel } from '@/sources/models/source.model'

@Module({
  imports: [
    SequelizeModule.forFeature([
      SourceModel,
      SourceClassificationHistoryModel,
      SourceScreeningModel,
      SourceChatModel,
      SourceLinkModel,
      ReadingListEntryModel,
    ]),
  ],
})
export class SourcesModule { }
