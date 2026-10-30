import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { AiModule } from '@/ai/ai.module'
import { ClarificationsController } from '@/research-app/clarifications/clarifications.controller'
import { ClarificationHandler } from '@/research-app/clarifications/handlers/clarification.handler'
import { CLARIFICATIONS_REPOSITORY } from '@/research-app/clarifications/interfaces/clarifications-repository.interface'
import { ResearchClarificationModel } from '@/research-app/clarifications/models/research-clarification.model'
import { ClarificationsRepository } from '@/research-app/clarifications/repositories/clarifications.repository'
import { ClarificationsService } from '@/research-app/clarifications/services/clarifications.service'

@Module({
  imports: [AiModule, SequelizeModule.forFeature([ResearchClarificationModel])],
  controllers: [ClarificationsController],
  providers: [ClarificationsService, ClarificationHandler, { provide: CLARIFICATIONS_REPOSITORY, useClass: ClarificationsRepository }],
})
export class ClarificationsModule { }
