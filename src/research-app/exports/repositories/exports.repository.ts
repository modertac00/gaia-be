import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { EVIDENCE_REVIEW, type NoteContent } from '@moderta/api-contracts/gaia'
import { Op } from 'sequelize'
import type { ExportRecord, NewExport } from '@/research-app/exports/interfaces/exports-repository.interface'
import { ExportModel } from '@/research-app/exports/models/export.model'
import type { ConsensusRecord, EvidenceRowRecord } from '@/research-app/evidence/interfaces/evidence-repository.interface'
import { EvidenceConsensusSynthesisModel } from '@/research-app/evidence/models/evidence-consensus-synthesis.model'
import { EvidenceRowModel } from '@/research-app/evidence/models/evidence-row.model'
import { ResearchNoteModel } from '@/research-app/notes/models/research-note.model'
import type { SourceRecord } from '@/research-app/sources/interfaces/sources-repository.interface'
import { SourceModel } from '@/research-app/sources/models/source.model'

@Injectable()
export class ExportsRepository {
  constructor(
    @InjectModel(ExportModel) private readonly exportModel: typeof ExportModel,
    @InjectModel(ResearchNoteModel) private readonly noteModel: typeof ResearchNoteModel,
    @InjectModel(SourceModel) private readonly sourceModel: typeof SourceModel,
    @InjectModel(EvidenceRowModel) private readonly evidenceRowModel: typeof EvidenceRowModel,
    @InjectModel(EvidenceConsensusSynthesisModel) private readonly consensusModel: typeof EvidenceConsensusSynthesisModel,
  ) { }

  // The find methods below are a read-only aggregation over data other modules own.

  async findIncludedSources(researchId: string): Promise<SourceRecord[]> {
    const rows = await this.sourceModel.findAll({
      where: { researchId, includedInResearch: true },
      order: [['marker', 'ASC']],
    })
    return rows.map((row) => this.toSourceRecord(row))
  }

  async findLatestNoteContent(researchId: string): Promise<NoteContent | null> {
    const row = await this.noteModel.findOne({
      where: { researchId },
      order: [['version', 'DESC']],
    })
    if (!row) {
      return null
    }
    return row.content
  }

  async findVisibleEvidenceRows(researchId: string): Promise<EvidenceRowRecord[]> {
    const rows = await this.evidenceRowModel.findAll({
      where: { researchId, review: { [Op.ne]: EVIDENCE_REVIEW.REJECTED } },
      include: [{ model: SourceModel, attributes: ['marker'], required: false }],
      order: [
        ['createdAt', 'ASC'],
        ['id', 'ASC'],
      ],
    })
    return rows.map((row) => this.toEvidenceRowRecord(row))
  }

  async findConsensus(researchId: string): Promise<ConsensusRecord | null> {
    const row = await this.consensusModel.findOne({ where: { researchId } })
    if (!row) {
      return null
    }
    return this.toConsensusRecord(row)
  }

  async create(newExport: NewExport): Promise<ExportRecord> {
    const row = await this.exportModel.create({ ...newExport })
    return this.toExportRecord(row)
  }

  private toExportRecord(row: ExportModel): ExportRecord {
    return {
      id: row.id,
      researchId: row.researchId,
      format: row.format,
      style: row.style,
      scope: row.scope,
      status: row.status,
      requestedBy: row.requestedBy,
      createdAt: row.createdAt,
    }
  }

  private toSourceRecord(row: SourceModel): SourceRecord {
    return {
      id: row.id,
      researchId: row.researchId,
      marker: row.marker,
      title: row.title,
      authors: row.authors,
      venue: row.venue,
      publicationYear: row.publicationYear,
      doi: row.doi,
      url: row.url,
      tier: row.tier,
      citedByCount: row.citedByCount,
      contentSummarization: row.contentSummarization,
      stance: row.classificationType,
      classifiedBy: row.classifiedBy,
      isVerified: row.isVerified,
      verifiedBy: row.verifiedBy,
      verifiedAt: row.verifiedAt,
      resolution: row.resolution,
      includedInResearch: row.includedInResearch,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  private toEvidenceRowRecord(row: EvidenceRowModel): EvidenceRowRecord {
    let sourceMarker: number | null = null
    if (row.source) {
      sourceMarker = row.source.marker
    }

    return {
      id: row.id,
      researchId: row.researchId,
      sourceId: row.sourceId,
      sourceMarker,
      study: row.study,
      locator: row.locator,
      method: row.method,
      sample: row.sample,
      reportedEffect: row.reportedEffect,
      origin: row.origin,
      review: row.review,
      status: row.status,
      failureReason: row.failureReason,
      reviewedBy: row.reviewedBy,
      reviewedAt: row.reviewedAt,
      createdAt: row.createdAt,
    }
  }

  private toConsensusRecord(row: EvidenceConsensusSynthesisModel): ConsensusRecord {
    return {
      id: row.id,
      researchId: row.researchId,
      verdict: row.verdict,
      supporting: row.supporting,
      mixed: row.mixed,
      contradicting: row.contradicting,
      generatedAt: row.generatedAt,
    }
  }
}
