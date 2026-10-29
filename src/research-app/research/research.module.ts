import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { RESEARCH_REPOSITORY } from '@/research-app/research/interfaces/research-repository.interface'
import { ResearchSupervisorModel } from '@/research-app/research/models/research-supervisor.model'
import { ResearchModel } from '@/research-app/research/models/research.model'
import { ResearchRepository } from '@/research-app/research/repositories/research.repository'
import { ResearchController } from '@/research-app/research/research.controller'
import { ResearchAccess } from '@/research-app/research/services/research-access.service'
import { ResearchService } from '@/research-app/research/services/research.service'

@Module({
  imports: [SequelizeModule.forFeature([ResearchModel, ResearchSupervisorModel])],
  controllers: [ResearchController],
  providers: [ResearchService, ResearchAccess, { provide: RESEARCH_REPOSITORY, useClass: ResearchRepository }],
  exports: [ResearchAccess],
})
export class ResearchModule { }
