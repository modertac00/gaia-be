import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  EVIDENCE_ALREADY_REVIEWED_MESSAGE,
  EVIDENCE_NOT_FOUND_MESSAGE,
  EVIDENCE_REVIEW,
  type EvidenceMatrix,
  type EvidenceReview,
  type EvidenceRow,
} from '@moderta/api-contracts/gaia'
import { TRANSACTION_RUNNER, type TransactionRunner } from '@/common/database/transaction-runner'
import { EVIDENCE_REPOSITORY } from '@/research-app/evidence/interfaces/evidence-repository.interface'
import { EvidenceRepository } from '@/research-app/evidence/repositories/evidence.repository'
import { toEvidenceMatrix, toEvidenceRow } from '@/research-app/evidence/utils/evidence-mapper'
import { ResearchAccess } from '@/research-app/research/services/research-access.service'

@Injectable()
export class EvidenceService {
  constructor(
    @Inject(EVIDENCE_REPOSITORY) private readonly repository: EvidenceRepository,
    @Inject(TRANSACTION_RUNNER) private readonly transactions: TransactionRunner,
    @Inject(ResearchAccess) private readonly research: ResearchAccess,
  ) { }

  async get(userId: string, researchId: string): Promise<EvidenceMatrix> {
    await this.research.assertVisible(userId, researchId)

    const rows = await this.repository.findVisibleRows(researchId)
    const consensus = await this.repository.findConsensus(researchId)

    return toEvidenceMatrix(rows, consensus)
  }

  accept(userId: string, researchId: string, evidenceId: string): Promise<EvidenceRow> {
    return this.review(userId, researchId, evidenceId, EVIDENCE_REVIEW.ACCEPTED)
  }

  reject(userId: string, researchId: string, evidenceId: string): Promise<EvidenceRow> {
    return this.review(userId, researchId, evidenceId, EVIDENCE_REVIEW.REJECTED)
  }

  private review(userId: string, researchId: string, evidenceId: string, review: EvidenceReview): Promise<EvidenceRow> {
    return this.transactions.run(async (options) => {
      await this.research.assertVisible(userId, researchId, options)

      const wasReviewed = await this.repository.review(researchId, evidenceId, review, userId, new Date(), options)
      const record = await this.repository.findRow(researchId, evidenceId, options)

      if (!record) {
        throw new NotFoundException(EVIDENCE_NOT_FOUND_MESSAGE)
      }
      if (!wasReviewed) {
        throw new ConflictException(EVIDENCE_ALREADY_REVIEWED_MESSAGE)
      }

      return toEvidenceRow(record)
    })
  }
}
