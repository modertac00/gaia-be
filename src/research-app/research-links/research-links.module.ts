import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { RESEARCH_LINKS_REPOSITORY } from '@/research-app/research-links/interfaces/research-links-repository.interface'
import { ResearchLinkModel } from '@/research-app/research-links/models/research-link.model'
import { ResearchLinksRepository } from '@/research-app/research-links/repositories/research-links.repository'
import { ResearchLinksController } from '@/research-app/research-links/research-links.controller'
import { ResearchLinksService } from '@/research-app/research-links/services/research-links.service'
import { ResearchModule } from '@/research-app/research/research.module'

@Module({
  imports: [ResearchModule, SequelizeModule.forFeature([ResearchLinkModel])],
  controllers: [ResearchLinksController],
  providers: [ResearchLinksService, { provide: RESEARCH_LINKS_REPOSITORY, useClass: ResearchLinksRepository }],
})
export class ResearchLinksModule { }
