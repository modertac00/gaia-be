import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { EVIDENCE_ORIGIN, EVIDENCE_REVIEW, EVIDENCE_STATUS, type EvidenceReview } from '@moderta/api-contracts/gaia'
import { Op } from 'sequelize'
import type { RepositoryOptions } from '@/common/database/repository-options'
import type {
  ConsensusRecord,
  EvidenceSourceInfo,
  EvidenceRowRecord,
  NewConsensus,
  NewEvidenceRow,
} from '@/research-app/evidence/interfaces/evidence-repository.interface'
import { EvidenceConsensusSynthesisModel } from '@/research-app/evidence/models/evidence-consensus-synthesis.model'
import { EvidenceRowModel } from '@/research-app/evidence/models/evidence-row.model'
import { ResearchModel } from '@/research-app/research/models/research.model'
import { SourceModel } from '@/research-app/sources/models/source.model'

@Injectable()
export class EvidenceRepository {
  constructor(
    @InjectModel(EvidenceRowModel) private readonly rowModel: typeof EvidenceRowModel,
    @InjectModel(EvidenceConsensusSynthesisModel) private readonly consensusModel: typeof EvidenceConsensusSynthesisModel,
    @InjectModel(ResearchModel) private readonly researchModel: typeof ResearchModel,
    @InjectModel(SourceModel) private readonly sourceModel: typeof SourceModel,
  ) { }

  async findVisibleRows(researchId: string): Promise<EvidenceRowRecord[]> {
    const rows = await this.rowModel.findAll({
      where: { researchId, review: { [Op.ne]: EVIDENCE_REVIEW.REJECTED } },
      include: [{ model: SourceModel, attributes: ['marker'], required: false }],
      order: [
        ['createdAt', 'ASC'],
        ['id', 'ASC'],
      ],
    })
    return rows.map((row) => this.toRowRecord(row))
  }

  async findRow(researchId: string, evidenceId: string, options: RepositoryOptions = {}): Promise<EvidenceRowRecord | null> {
    const row = await this.rowModel.findOne({
      where: { id: evidenceId, researchId },
      include: [{ model: SourceModel, attributes: ['marker'], required: false }],
      transaction: options.transaction,
    })
    return row ? this.toRowRecord(row) : null
  }

  async findConsensus(researchId: string): Promise<ConsensusRecord | null> {
    const row = await this.consensusModel.findOne({ where: { researchId } })
    return row ? this.toConsensusRecord(row) : null
  }

  async review(
    researchId: string,
    evidenceId: string,
    review: EvidenceReview,
    userId: string,
    reviewedAt: Date,
    options: RepositoryOptions = {},
  ): Promise<boolean> {
    const [count] = await this.rowModel.update(
      { review, reviewedBy: userId, reviewedAt },
      {
        where: { id: evidenceId, researchId, review: EVIDENCE_REVIEW.PENDING, status: EVIDENCE_STATUS.READY },
        transaction: options.transaction,
      },
    )
    return count > 0
  }

  async lockResearch(researchId: string, options: RepositoryOptions = {}): Promise<boolean> {
    const research = await this.researchModel.findByPk(researchId, {
      attributes: ['id'],
      transaction: options.transaction,
      lock: options.transaction ? options.transaction.LOCK.UPDATE : undefined,
    })
    return research !== null
  }

  async findSourceInfo(researchId: string, sourceId: string, options: RepositoryOptions = {}): Promise<EvidenceSourceInfo | null> {
    const source = await this.sourceModel.findOne({
      attributes: ['id', 'title', 'authors'],
      where: { id: sourceId, researchId },
      transaction: options.transaction,
    })
    if (!source) return null

    return { id: source.id, title: source.title, authors: source.authors }
  }

  async saveRow(row: NewEvidenceRow, options: RepositoryOptions = {}): Promise<void> {
    const values = { ...row, origin: EVIDENCE_ORIGIN.AI_EXTRACTED, review: EVIDENCE_REVIEW.PENDING }

    const existing = await this.rowModel.findByPk(row.id, { transaction: options.transaction })
    if (existing) {
      await existing.update(values, { transaction: options.transaction })
      return
    }

    await this.rowModel.create(values, { transaction: options.transaction })
  }

  async saveConsensus(consensus: NewConsensus, generatedAt: Date, options: RepositoryOptions = {}): Promise<void> {
    const { researchId, ...values } = consensus

    const [count] = await this.consensusModel.update(
      { ...values, generatedAt },
      { where: { researchId }, transaction: options.transaction },
    )
    if (count > 0) return

    await this.consensusModel.create({ ...consensus, generatedAt }, { transaction: options.transaction })
  }

  private toRowRecord(row: EvidenceRowModel): EvidenceRowRecord {
    return {
      id: row.id,
      researchId: row.researchId,
      sourceId: row.sourceId,
      sourceMarker: row.source ? row.source.marker : null,
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
