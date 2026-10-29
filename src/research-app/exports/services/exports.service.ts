import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import {
  ACTIVITY_ACTOR_TYPE,
  ACTIVITY_RESULT,
  ACTIVITY_TARGET_TYPE,
  ACTIVITY_TOOL,
  EXPORT_BLOCKED_MESSAGE,
  EXPORT_FORMATS,
  EXPORT_SCOPES,
  EXPORT_STATUS,
  type CreateExportDto,
  type Export,
  type ExportContent,
} from '@moderta/api-contracts/gaia'
import { ApiException } from '@/common/http/api-exception'
import { ActivityRecorder } from '@/research-app/audit/services/activity-recorder.service'
import { EXPORTS_REPOSITORY } from '@/research-app/exports/interfaces/exports-repository.interface'
import { ExportsRepository } from '@/research-app/exports/repositories/exports.repository'
import { toExport } from '@/research-app/exports/utils/export-mapper'
import { partsOf } from '@/research-app/exports/utils/export-parts'
import { toConsensus, toEvidenceRow } from '@/research-app/evidence/utils/evidence-mapper'
import { ResearchAccess } from '@/research-app/research/services/research-access.service'
import type { ResearchRecord } from '@/research-app/research/interfaces/research-repository.interface'
import type { SourceRecord } from '@/research-app/sources/interfaces/sources-repository.interface'
import { toSource } from '@/research-app/sources/utils/source-mapper'

@Injectable()
export class ExportsService {
  constructor(
    @Inject(EXPORTS_REPOSITORY) private readonly repository: ExportsRepository,
    @Inject(ResearchAccess) private readonly research: ResearchAccess,
    @Inject(ActivityRecorder) private readonly activity: ActivityRecorder,
  ) { }

  async create(userId: string, researchId: string, dto: CreateExportDto): Promise<Export> {
    const research = await this.research.assertVisible(userId, researchId)

    const sources = await this.repository.findIncludedSources(researchId)
    await this.assertAllVerified(userId, research, sources)

    const content = await this.buildContent(researchId, dto, sources)
    const record = await this.repository.create({
      researchId,
      format: dto.format,
      style: dto.style,
      scope: dto.scope,
      status: EXPORT_STATUS.READY,
      requestedBy: userId,
    })

    const formatLabel = EXPORT_FORMATS.find((item) => item.value === dto.format)?.label ?? dto.format
    const scopeLabel = EXPORT_SCOPES.find((item) => item.value === dto.scope)?.label ?? dto.scope
    await this.activity.record({
      researchId,
      tool: ACTIVITY_TOOL.LITERATURE_REVIEW,
      action: `Exported ${formatLabel} (${scopeLabel})`,
      targetType: ACTIVITY_TARGET_TYPE.EXPORT,
      targetId: record.id,
      targetLabel: `${research.docKey} · ${formatLabel}`,
      actorType: ACTIVITY_ACTOR_TYPE.USER,
      actorUserId: userId,
      result: ACTIVITY_RESULT.SUCCESS,
    })

    return toExport(record, content)
  }

  private async assertAllVerified(userId: string, research: ResearchRecord, sources: SourceRecord[]): Promise<void> {
    const unverifiedSourceIds = sources.filter((source) => !source.isVerified).map((source) => source.id)

    if (unverifiedSourceIds.length > 0) {
      await this.activity.record({
        researchId: research.id,
        tool: ACTIVITY_TOOL.LITERATURE_REVIEW,
        action: `Export blocked: ${unverifiedSourceIds.length} unverified source(s)`,
        targetType: ACTIVITY_TARGET_TYPE.RESEARCH,
        targetId: research.id,
        targetLabel: research.docKey,
        actorType: ACTIVITY_ACTOR_TYPE.USER,
        actorUserId: userId,
        result: ACTIVITY_RESULT.BLOCKED,
      })
      throw new ApiException(HttpStatus.CONFLICT, {
        message: EXPORT_BLOCKED_MESSAGE,
        details: { unverifiedSourceIds },
      })
    }
  }

  private async buildContent(researchId: string, dto: CreateExportDto, sources: SourceRecord[]): Promise<ExportContent> {
    const parts = partsOf(dto)
    const content: ExportContent = { note: null, sources: null, evidenceRows: null, consensus: null }

    if (parts.note) {
      content.note = await this.repository.findLatestNoteContent(researchId)
    }

    if (parts.sources) {
      content.sources = sources.map(toSource)
    }

    if (parts.evidence) {
      const rows = await this.repository.findVisibleEvidenceRows(researchId)
      content.evidenceRows = rows.map(toEvidenceRow)

      const consensus = await this.repository.findConsensus(researchId)
      if (consensus) {
        content.consensus = toConsensus(consensus)
      }
    }

    return content
  }
}
