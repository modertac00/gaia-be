import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { AiModule } from '@/ai/ai.module'
import { NoteCreatorModule } from '@/research-app/notes/note-creator.module'
import { ResearchCreatedHandler } from '@/research-app/research/handlers/research-created.handler'
import { RESEARCH_REPOSITORY } from '@/research-app/research/interfaces/research-repository.interface'
import { ResearchSupervisorModel } from '@/research-app/research/models/research-supervisor.model'
import { ResearchModel } from '@/research-app/research/models/research.model'
import { ResearchRepository } from '@/research-app/research/repositories/research.repository'
import { ResearchController } from '@/research-app/research/research.controller'
import { ResearchAccess } from '@/research-app/research/services/research-access.service'
import { ResearchService } from '@/research-app/research/services/research.service'

@Module({
  imports: [AiModule, NoteCreatorModule, SequelizeModule.forFeature([ResearchModel, ResearchSupervisorModel])],
  controllers: [ResearchController],
  providers: [ResearchService, ResearchAccess, ResearchCreatedHandler, { provide: RESEARCH_REPOSITORY, useClass: ResearchRepository }],
  exports: [ResearchAccess],
})
export class ResearchModule { }
