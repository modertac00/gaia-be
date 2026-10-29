import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { AuditModule } from '@/research-app/audit/audit.module'
import { EvidenceConsensusSynthesisModel } from '@/research-app/evidence/models/evidence-consensus-synthesis.model'
import { EvidenceRowModel } from '@/research-app/evidence/models/evidence-row.model'
import { ExportsController } from '@/research-app/exports/exports.controller'
import { EXPORTS_REPOSITORY } from '@/research-app/exports/interfaces/exports-repository.interface'
import { ExportModel } from '@/research-app/exports/models/export.model'
import { ExportsRepository } from '@/research-app/exports/repositories/exports.repository'
import { ExportsService } from '@/research-app/exports/services/exports.service'
import { ResearchNoteModel } from '@/research-app/notes/models/research-note.model'
import { ResearchModel } from '@/research-app/research/models/research.model'
import { ResearchModule } from '@/research-app/research/research.module'
import { SourceModel } from '@/research-app/sources/models/source.model'

@Module({
  imports: [
    AuditModule,
    ResearchModule,
    SequelizeModule.forFeature([
      ExportModel,
      ResearchModel,
      ResearchNoteModel,
      SourceModel,
      EvidenceRowModel,
      EvidenceConsensusSynthesisModel,
    ]),
  ],
  controllers: [ExportsController],
  providers: [ExportsService, { provide: EXPORTS_REPOSITORY, useClass: ExportsRepository }],
})
export class ExportsModule { }
