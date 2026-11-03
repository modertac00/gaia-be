import { Inject, Injectable, type OnModuleInit } from '@nestjs/common'
import { AI_RUN_KIND, type AiError, type AuditFindingsResult } from '@moderta/api-contracts/gaia'
import { AiHandlers, type AiResponseHandler } from '@/ai/ai-handlers'
import { TRANSACTION_RUNNER, type TransactionRunner } from '@/common/database/transaction-runner'
import { AppLogger } from '@/log'
import { AUDIT_REPOSITORY } from '@/research-app/audit/interfaces/audit-repository.interface'
import { AuditRepository } from '@/research-app/audit/repositories/audit.repository'

@Injectable()
export class AuditFindingsHandler implements AiResponseHandler<typeof AI_RUN_KIND.AUDIT_FINDINGS>, OnModuleInit {
  readonly kind = AI_RUN_KIND.AUDIT_FINDINGS

  constructor(
    @Inject(AiHandlers) private readonly handlers: AiHandlers,
    @Inject(AUDIT_REPOSITORY) private readonly repository: AuditRepository,
    @Inject(TRANSACTION_RUNNER) private readonly transactions: TransactionRunner,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) { }

  onModuleInit(): void {
    this.handlers.register(this)
  }

  onSucceeded(taskId: string, result: AuditFindingsResult): Promise<void> {
    return this.transactions.run(async (options) => {
      const { researchId } = result

      const researchExists = await this.repository.lockResearch(researchId, options)
      if (!researchExists) {
        this.logger.warn(`Audit findings run ${taskId} is for unknown research ${researchId}`, AuditFindingsHandler.name)
        return
      }

      await this.repository.deleteFindings(researchId, options)
      await this.repository.createFindings(researchId, result.findings, taskId, options)
    })
  }

  onFailed(taskId: string, error: AiError, researchId?: string): Promise<void> {
    const researchLabel = researchId ? researchId : 'unknown'
    this.logger.warn(`Audit findings run ${taskId} failed (${error.code}) for research ${researchLabel}`, AuditFindingsHandler.name)
    return Promise.resolve()
  }
}
