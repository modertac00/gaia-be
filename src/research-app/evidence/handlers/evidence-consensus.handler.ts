import { Inject, Injectable, type OnModuleInit } from '@nestjs/common'
import { AI_RUN_KIND, type AiError, type EvidenceConsensusResult } from '@moderta/api-contracts/gaia'
import { AiHandlers, type AiResponseHandler } from '@/ai/ai-handlers'
import { TRANSACTION_RUNNER, type TransactionRunner } from '@/common/database/transaction-runner'
import { AppLogger } from '@/log'
import { EVIDENCE_REPOSITORY } from '@/research-app/evidence/interfaces/evidence-repository.interface'
import { EvidenceRepository } from '@/research-app/evidence/repositories/evidence.repository'

/** The AI's reading of what the evidence says. One consensus per research; a new result replaces it. */
@Injectable()
export class EvidenceConsensusHandler implements AiResponseHandler<typeof AI_RUN_KIND.EVIDENCE_CONSENSUS>, OnModuleInit {
  readonly kind = AI_RUN_KIND.EVIDENCE_CONSENSUS

  constructor(
    @Inject(AiHandlers) private readonly handlers: AiHandlers,
    @Inject(EVIDENCE_REPOSITORY) private readonly repository: EvidenceRepository,
    @Inject(TRANSACTION_RUNNER) private readonly transactions: TransactionRunner,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) { }

  onModuleInit(): void {
    this.handlers.register(this)
  }

  onSucceeded(taskId: string, result: EvidenceConsensusResult): Promise<void> {
    return this.transactions.run(async (options) => {
      const { researchId } = result

      const researchExists = await this.repository.lockResearch(researchId, options)
      if (!researchExists) {
        this.logger.warn(`Evidence consensus ${taskId} is for unknown research ${researchId}`, EvidenceConsensusHandler.name)
        return
      }

      await this.repository.saveConsensus({ ...result, runId: taskId }, new Date(), options)
    })
  }

  onFailed(taskId: string, error: AiError, researchId?: string): Promise<void> {
    const researchLabel = researchId ? researchId : 'unknown'
    this.logger.warn(`Evidence consensus ${taskId} failed (${error.code}) for research ${researchLabel}`, EvidenceConsensusHandler.name)
    return Promise.resolve()
  }
}
