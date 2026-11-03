import { Inject, Injectable, type OnModuleInit } from '@nestjs/common'
import {
  AI_RUN_KIND,
  EVIDENCE_REVIEW,
  EVIDENCE_STATUS,
  type AiError,
  type EvidenceExtractionResult,
} from '@moderta/api-contracts/gaia'
import { AiHandlers, type AiResponseHandler } from '@/ai/ai-handlers'
import { ResultNotReadyError } from '@/ai/result-not-ready'
import type { RepositoryOptions } from '@/common/database/repository-options'
import { TRANSACTION_RUNNER, type TransactionRunner } from '@/common/database/transaction-runner'
import { AppLogger } from '@/log'
import { EVIDENCE_REPOSITORY, type NewEvidenceRow } from '@/research-app/evidence/interfaces/evidence-repository.interface'
import { EvidenceRepository } from '@/research-app/evidence/repositories/evidence.repository'
import { failureMessageFor, readFailedRowDetails, studyLabelFor } from '@/research-app/evidence/utils/failed-row'

const ROW_FAILED_CODE = 'evidence_row_failed'

/** The AI sends one evidence row per message, or one failure per row it could not extract. */
@Injectable()
export class EvidenceExtractionHandler implements AiResponseHandler<typeof AI_RUN_KIND.EVIDENCE_EXTRACTION>, OnModuleInit {
  readonly kind = AI_RUN_KIND.EVIDENCE_EXTRACTION

  constructor(
    @Inject(AiHandlers) private readonly handlers: AiHandlers,
    @Inject(EVIDENCE_REPOSITORY) private readonly repository: EvidenceRepository,
    @Inject(TRANSACTION_RUNNER) private readonly transactions: TransactionRunner,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) { }

  onModuleInit(): void {
    this.handlers.register(this)
  }

  onSucceeded(taskId: string, result: EvidenceExtractionResult): Promise<void> {
    return this.transactions.run(async (options) => {
      const { researchId, rowId, paperId } = result

      const researchExists = await this.repository.lockResearch(researchId, options)
      if (!researchExists) {
        this.logger.warn(`Evidence run ${taskId} is for unknown research ${researchId}`, EvidenceExtractionHandler.name)
        return
      }

      const source = await this.repository.findSourceInfo(researchId, paperId, options)
      if (!source) {
        throw this.sourceNotReady(taskId, paperId)
      }

      const row: NewEvidenceRow = {
        id: rowId,
        researchId,
        sourceId: paperId,
        runId: taskId,
        study: result.study,
        locator: result.locator,
        method: result.method,
        sample: result.sample,
        reportedEffect: result.reportedError,
        status: EVIDENCE_STATUS.READY,
        failureReason: null,
      }
      await this.saveUnlessReviewed(taskId, row, options)
    })
  }

  onFailed(taskId: string, error: AiError, researchId?: string): Promise<void> {
    if (error.code !== ROW_FAILED_CODE) {
      const researchLabel = researchId ? researchId : 'unknown'
      this.logger.warn(`Evidence run ${taskId} failed (${error.code}) for research ${researchLabel}`, EvidenceExtractionHandler.name)
      return Promise.resolve()
    }

    const details = readFailedRowDetails(error.details)
    if (!details) {
      this.logger.warn(`Evidence run ${taskId} failed without a rowId and paperId in its details`, EvidenceExtractionHandler.name)
      return Promise.resolve()
    }
    if (!researchId) {
      this.logger.warn(`Evidence run ${taskId} failed without a research id`, EvidenceExtractionHandler.name)
      return Promise.resolve()
    }

    return this.transactions.run(async (options) => {
      const researchExists = await this.repository.lockResearch(researchId, options)
      if (!researchExists) {
        this.logger.warn(`Evidence run ${taskId} failed for unknown research ${researchId}`, EvidenceExtractionHandler.name)
        return
      }

      const source = await this.repository.findSourceInfo(researchId, details.paperId, options)
      if (!source) {
        throw this.sourceNotReady(taskId, details.paperId)
      }

      const row: NewEvidenceRow = {
        id: details.rowId,
        researchId,
        sourceId: details.paperId,
        runId: taskId,
        study: studyLabelFor(source),
        locator: null,
        method: null,
        sample: null,
        reportedEffect: null,
        status: EVIDENCE_STATUS.FAILED,
        failureReason: failureMessageFor(details.reason, error.message),
      }
      await this.saveUnlessReviewed(taskId, row, options)
    })
  }

  private async saveUnlessReviewed(taskId: string, row: NewEvidenceRow, options: RepositoryOptions): Promise<void> {
    const existing = await this.repository.findRow(row.researchId, row.id, options)
    if (existing && existing.review !== EVIDENCE_REVIEW.PENDING) {
      this.logger.debug(`Evidence run ${taskId}: row ${row.id} was already reviewed, left as it is`, EvidenceExtractionHandler.name)
      return
    }

    await this.repository.saveRow(row, options)
  }

  private sourceNotReady(taskId: string, sourceId: string): ResultNotReadyError {
    const message = `Evidence run ${taskId}: source ${sourceId} is not saved yet, it will be retried`
    this.logger.warn(message, EvidenceExtractionHandler.name)
    return new ResultNotReadyError(message)
  }
}
