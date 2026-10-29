import { Inject, Injectable, type OnModuleInit } from '@nestjs/common'
import {
  AI_RUN_KIND,
  type AiError,
  EVIDENCE_EXTRACTION_FAILED_MESSAGE,
  EVIDENCE_STATUS,
  type EvidenceExtractionResult,
} from '@moderta/api-contracts/gaia'
import { AiHandlers, type AiResponseHandler } from '@/ai/ai-handlers'
import { TRANSACTION_RUNNER, type TransactionRunner } from '@/common/database/transaction-runner'
import { AppLogger } from '@/log'
import { EVIDENCE_REPOSITORY, type NewEvidenceRow } from '@/research-app/evidence/interfaces/evidence-repository.interface'
import { EvidenceRepository } from '@/research-app/evidence/repositories/evidence.repository'

const FAILED_ROW_STUDY = 'Evidence extraction'

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
      const { researchId } = result

      const researchExists = await this.repository.lockResearch(researchId, options)
      if (!researchExists) {
        this.logger.warn(`Evidence run ${taskId} is for unknown research ${researchId}`, EvidenceExtractionHandler.name)
        return
      }

      const alreadyStored = await this.repository.hasRunData(taskId, options)
      if (alreadyStored) {
        return
      }

      const givenIds = result.rows.map((row) => row.sourceId)
      const validIds = await this.repository.findResearchSourceIds(researchId, givenIds, options)

      const rows: NewEvidenceRow[] = []
      for (const row of result.rows) {
        if (!validIds.includes(row.sourceId)) {
          this.logger.warn(
            `Evidence run ${taskId} returned source ${row.sourceId}, which is not in research ${researchId}`,
            EvidenceExtractionHandler.name,
          )
          continue
        }
        rows.push({ ...row, researchId, runId: taskId, status: EVIDENCE_STATUS.READY, failureReason: null })
      }

      await this.repository.createRows(rows, options)
      await this.repository.saveConsensus({ researchId, runId: taskId, ...result.consensus }, new Date(), options)
    })
  }

  onFailed(taskId: string, error: AiError, researchId?: string): Promise<void> {
    if (!researchId) {
      this.logger.warn(`Evidence run ${taskId} failed (${error.code}) without a research id`, EvidenceExtractionHandler.name)
      return Promise.resolve()
    }

    return this.transactions.run(async (options) => {
      const researchExists = await this.repository.lockResearch(researchId, options)

      if (!researchExists) {
        this.logger.warn(`Evidence run ${taskId} failed for unknown research ${researchId}`, EvidenceExtractionHandler.name)
        return
      }

      const alreadyStored = await this.repository.hasRunData(taskId, options)

      if (alreadyStored) {
        return
      }

      const failedRow: NewEvidenceRow = {
        researchId,
        sourceId: null,
        runId: taskId,
        study: FAILED_ROW_STUDY,
        locator: null,
        method: null,
        sample: null,
        reportedEffect: null,
        status: EVIDENCE_STATUS.FAILED,
        failureReason: EVIDENCE_EXTRACTION_FAILED_MESSAGE,
      }
      await this.repository.createRows([failedRow], options)
    })
  }
}
