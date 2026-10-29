import { Inject, Injectable, type OnModuleInit } from '@nestjs/common'
import { AI_RUN_KIND, type AiError, type RelatedPapersResult } from '@moderta/api-contracts/gaia'
import { AiHandlers, type AiResponseHandler } from '@/ai/ai-handlers'
import { TRANSACTION_RUNNER, type TransactionRunner } from '@/common/database/transaction-runner'
import { AppLogger } from '@/log'
import { RELATED_REPOSITORY } from '@/research-app/related/interfaces/related-repository.interface'
import { RelatedRepository } from '@/research-app/related/repositories/related.repository'

@Injectable()
export class RelatedPapersHandler implements AiResponseHandler<typeof AI_RUN_KIND.RELATED_PAPERS>, OnModuleInit {
  readonly kind = AI_RUN_KIND.RELATED_PAPERS

  constructor(
    @Inject(AiHandlers) private readonly handlers: AiHandlers,
    @Inject(RELATED_REPOSITORY) private readonly repository: RelatedRepository,
    @Inject(TRANSACTION_RUNNER) private readonly transactions: TransactionRunner,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) { }

  onModuleInit(): void {
    this.handlers.register(this)
  }

  onSucceeded(taskId: string, result: RelatedPapersResult): Promise<void> {
    return this.transactions.run(async (options) => {
      const { researchId } = result

      const researchExists = await this.repository.lockResearch(researchId, options)
      if (!researchExists) {
        this.logger.warn(`Related papers run ${taskId} is for unknown research ${researchId}`, RelatedPapersHandler.name)
        return
      }

      const sourceIds = await this.repository.findResearchSourceIds(researchId, options)

      const links: RelatedPapersResult['links'] = []
      for (const link of result.links) {

        if (link.fromSourceId === link.toSourceId) {
          this.logger.warn(`Related papers run ${taskId} returned a link from a source to itself`, RelatedPapersHandler.name)
          continue
        }

        if (!sourceIds.includes(link.fromSourceId) || !sourceIds.includes(link.toSourceId)) {
          this.logger.warn(
            `Related papers run ${taskId} returned a link with a source that is not in research ${researchId}`,
            RelatedPapersHandler.name,
          )
          continue
        }

        links.push(link)
      }

      const readingList: RelatedPapersResult['readingList'] = []

      for (const entry of result.readingList) {
        if (!sourceIds.includes(entry.sourceId)) {
          this.logger.warn(
            `Related papers run ${taskId} returned source ${entry.sourceId}, which is not in research ${researchId}`,
            RelatedPapersHandler.name,
          )
          continue
        }
        readingList.push(entry)
      }

      await this.repository.deleteAll(researchId, options)
      await this.repository.createLinks(researchId, links, options)
      await this.repository.createReadingList(researchId, readingList, options)
    })
  }

  onFailed(taskId: string, error: AiError, researchId?: string): Promise<void> {
    const researchLabel = researchId ? researchId : 'unknown'
    this.logger.warn(`Related papers run ${taskId} failed (${error.code}) for research ${researchLabel}`, RelatedPapersHandler.name)
    return Promise.resolve()
  }

}
