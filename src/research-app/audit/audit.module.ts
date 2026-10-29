import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { AiModule } from '@/ai/ai.module'
import { AuditController } from '@/research-app/audit/audit.controller'
import { AuditFindingsHandler } from '@/research-app/audit/handlers/audit-findings.handler'
import { AUDIT_REPOSITORY } from '@/research-app/audit/interfaces/audit-repository.interface'
import { ActivityEventModel } from '@/research-app/audit/models/activity-event.model'
import { AuditFindingModel } from '@/research-app/audit/models/audit-finding.model'
import { AuditRepository } from '@/research-app/audit/repositories/audit.repository'
import { ActivityRecorder } from '@/research-app/audit/services/activity-recorder.service'
import { AuditService } from '@/research-app/audit/services/audit.service'
import { ResearchNoteModel } from '@/research-app/notes/models/research-note.model'
import { ResearchModel } from '@/research-app/research/models/research.model'
import { ResearchModule } from '@/research-app/research/research.module'
import { SourceModel } from '@/research-app/sources/models/source.model'

@Module({
  imports: [
    AiModule,
    ResearchModule,
    SequelizeModule.forFeature([ActivityEventModel, AuditFindingModel, ResearchModel, ResearchNoteModel, SourceModel]),
  ],
  controllers: [AuditController],
  providers: [AuditService, ActivityRecorder, AuditFindingsHandler, { provide: AUDIT_REPOSITORY, useClass: AuditRepository }],
  exports: [ActivityRecorder],
})
export class AuditModule { }
