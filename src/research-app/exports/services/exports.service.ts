import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { EXPORT_BLOCKED_MESSAGE, EXPORT_STATUS, type CreateExportDto, type Export, type ExportContent } from '@moderta/api-contracts/gaia'
import { ApiException } from '@/common/http/api-exception'
import { EXPORTS_REPOSITORY } from '@/research-app/exports/interfaces/exports-repository.interface'
import { ExportsRepository } from '@/research-app/exports/repositories/exports.repository'
import { toExport } from '@/research-app/exports/utils/export-mapper'
import { partsOf } from '@/research-app/exports/utils/export-parts'
import { toConsensus, toEvidenceRow } from '@/research-app/evidence/utils/evidence-mapper'
import { ResearchAccess } from '@/research-app/research/services/research-access.service'
import type { SourceRecord } from '@/research-app/sources/interfaces/sources-repository.interface'
import { toSource } from '@/research-app/sources/utils/source-mapper'

@Injectable()
export class ExportsService {
  constructor(
    @Inject(EXPORTS_REPOSITORY) private readonly repository: ExportsRepository,
    @Inject(ResearchAccess) private readonly research: ResearchAccess,
  ) { }

  async create(userId: string, researchId: string, dto: CreateExportDto): Promise<Export> {
    await this.research.assertVisible(userId, researchId)

    const sources = await this.repository.findIncludedSources(researchId)
    this.assertAllVerified(sources)

    const content = await this.buildContent(researchId, dto, sources)
    const record = await this.repository.create({
      researchId,
      format: dto.format,
      style: dto.style,
      scope: dto.scope,
      status: EXPORT_STATUS.READY,
      requestedBy: userId,
    })

    return toExport(record, content)
  }

  private assertAllVerified(sources: SourceRecord[]): void {
    const unverifiedSourceIds = sources.filter((source) => !source.isVerified).map((source) => source.id)

    if (unverifiedSourceIds.length > 0) {
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
