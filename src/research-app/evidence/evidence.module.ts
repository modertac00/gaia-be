import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { AiModule } from '@/ai/ai.module'
import { AuditModule } from '@/research-app/audit/audit.module'
import { EvidenceController } from '@/research-app/evidence/evidence.controller'
import { EvidenceExtractionHandler } from '@/research-app/evidence/handlers/evidence-extraction.handler'
import { EVIDENCE_REPOSITORY } from '@/research-app/evidence/interfaces/evidence-repository.interface'
import { EvidenceConsensusSynthesisModel } from '@/research-app/evidence/models/evidence-consensus-synthesis.model'
import { EvidenceRowModel } from '@/research-app/evidence/models/evidence-row.model'
import { EvidenceRepository } from '@/research-app/evidence/repositories/evidence.repository'
import { EvidenceService } from '@/research-app/evidence/services/evidence.service'
import { ResearchModel } from '@/research-app/research/models/research.model'
import { ResearchModule } from '@/research-app/research/research.module'
import { SourceModel } from '@/research-app/sources/models/source.model'

@Module({
  imports: [
    AiModule,
    AuditModule,
    ResearchModule,
    SequelizeModule.forFeature([EvidenceRowModel, EvidenceConsensusSynthesisModel, ResearchModel, SourceModel]),
  ],
  controllers: [EvidenceController],
  providers: [EvidenceService, EvidenceExtractionHandler, { provide: EVIDENCE_REPOSITORY, useClass: EvidenceRepository }],
})
export class EvidenceModule { }
