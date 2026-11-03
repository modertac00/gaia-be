import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { RESEARCH_REPOSITORY } from '@/research/interfaces/research-repository.interface'
import { ResearchSupervisorModel } from '@/research/models/research-supervisor.model'
import { ResearchModel } from '@/research/models/research.model'
import { ResearchRepository } from '@/research/repositories/research.repository'
import { ResearchController } from '@/research/research.controller'
import { ResearchService } from '@/research/services/research.service'

@Module({
  imports: [SequelizeModule.forFeature([ResearchModel, ResearchSupervisorModel])],
  controllers: [ResearchController],
  providers: [ResearchService, { provide: RESEARCH_REPOSITORY, useClass: ResearchRepository }],
})
export class ResearchModule { }
