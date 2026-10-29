import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { EVIDENCE_ORIGIN, EVIDENCE_REVIEW, EVIDENCE_STATUS, type EvidenceReview } from '@moderta/api-contracts/gaia'
import { Op } from 'sequelize'
import type { RepositoryOptions } from '@/common/database/repository-options'
import type {
  ConsensusRecord,
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

  /** Every row of the research that has not been rejected, oldest first. */
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

  /** Only a pending, ready row can be reviewed. Returns false when the row did not match. */
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

  /**
   * Locks the research row until the transaction ends, so two deliveries of the same AI result run one after the other.
   * Returns false when the research does not exist.
   */
  async lockResearch(researchId: string, options: RepositoryOptions = {}): Promise<boolean> {
    const research = await this.researchModel.findByPk(researchId, {
      attributes: ['id'],
      transaction: options.transaction,
      lock: options.transaction ? options.transaction.LOCK.UPDATE : undefined,
    })
    return research !== null
  }

  /** True when this AI run already stored rows or a consensus. */
  async hasRunData(runId: string, options: RepositoryOptions = {}): Promise<boolean> {
    const rowCount = await this.rowModel.count({ where: { runId }, transaction: options.transaction })
    if (rowCount > 0) {
      return true
    }

    const consensusCount = await this.consensusModel.count({ where: { runId }, transaction: options.transaction })
    return consensusCount > 0
  }

  /** The ids, out of those given, that are sources of the research. */
  async findResearchSourceIds(researchId: string, sourceIds: string[], options: RepositoryOptions = {}): Promise<string[]> {
    const sources = await this.sourceModel.findAll({
      attributes: ['id'],
      where: { researchId, id: sourceIds },
      transaction: options.transaction,
    })
    return sources.map((source) => source.id)
  }

  async createRows(rows: NewEvidenceRow[], options: RepositoryOptions = {}): Promise<void> {
    const values = rows.map((row) => ({
      ...row,
      origin: EVIDENCE_ORIGIN.AI_EXTRACTED,
      review: EVIDENCE_REVIEW.PENDING,
    }))
    await this.rowModel.bulkCreate(values, { transaction: options.transaction })
  }

  /** Updates the consensus of the research, or creates it when there is none. */
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
