import { Inject, Injectable, type OnModuleInit } from '@nestjs/common'
import { AI_RUN_KIND, type AiError, type RelatedLinksResult } from '@moderta/api-contracts/gaia'
import { AiHandlers, type AiResponseHandler } from '@/ai/ai-handlers'
import { TRANSACTION_RUNNER, type TransactionRunner } from '@/common/database/transaction-runner'
import { AppLogger } from '@/log'
import { RELATED_REPOSITORY, type ReadingListRecord } from '@/research-app/related/interfaces/related-repository.interface'
import { RelatedRepository } from '@/research-app/related/repositories/related.repository'

@Injectable()
export class RelatedLinksHandler implements AiResponseHandler<typeof AI_RUN_KIND.RELATED_LINKS>, OnModuleInit {
  readonly kind = AI_RUN_KIND.RELATED_LINKS

  constructor(
    @Inject(AiHandlers) private readonly handlers: AiHandlers,
    @Inject(RELATED_REPOSITORY) private readonly repository: RelatedRepository,
    @Inject(TRANSACTION_RUNNER) private readonly transactions: TransactionRunner,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) { }

  onModuleInit(): void {
    this.handlers.register(this)
  }

  onSucceeded(taskId: string, result: RelatedLinksResult): Promise<void> {
    return this.transactions.run(async (options) => {
      const { researchId } = result

      const research = await this.repository.lockResearch(researchId, options)
      if (!research) {
        this.logger.warn(`Related links run ${taskId} is for unknown research ${researchId}`, RelatedLinksHandler.name)
        return
      }

      const generatedAt = new Date(result.generatedAt)
      if (research.relatedLinksGeneratedAt && generatedAt < research.relatedLinksGeneratedAt) {
        this.logger.warn(
          `Related links run ${taskId} is older than the stored links of research ${researchId}, ignored`,
          RelatedLinksHandler.name,
        )
        return
      }

      for (const warning of result.warnings) {
        this.logger.warn(`Related links run ${taskId} reported ${warning} for research ${researchId}`, RelatedLinksHandler.name)
      }

      const sourceIds = await this.repository.findResearchSourceIds(researchId, options)
      const links = this.keepLinksBetweenSources(taskId, researchId, result.links, sourceIds)
      const readingList = this.joinReadingListWithPapers(taskId, result)

      await this.repository.deleteAll(researchId, options)
      await this.repository.createLinks(researchId, links, options)
      await this.repository.createReadingList(researchId, readingList, options)
      await this.repository.saveLinksGeneratedAt(researchId, generatedAt, options)
    })
  }

  onFailed(taskId: string, error: AiError, researchId?: string): Promise<void> {
    const researchLabel = researchId ? researchId : 'unknown'
    this.logger.warn(`Related links run ${taskId} failed (${error.code}) for research ${researchLabel}`, RelatedLinksHandler.name)
    return Promise.resolve()
  }

  private keepLinksBetweenSources(
    taskId: string,
    researchId: string,
    links: RelatedLinksResult['links'],
    sourceIds: string[],
  ): RelatedLinksResult['links'] {
    const kept: RelatedLinksResult['links'] = []

    for (const link of links) {
      if (link.fromSourceId === link.toSourceId) {
        this.logger.warn(`Related links run ${taskId} returned a link from a source to itself`, RelatedLinksHandler.name)
        continue
      }

      if (!sourceIds.includes(link.fromSourceId) || !sourceIds.includes(link.toSourceId)) {
        this.logger.warn(
          `Related links run ${taskId} returned a link with a source that is not in research ${researchId}`,
          RelatedLinksHandler.name,
        )
        continue
      }

      kept.push(link)
    }

    return kept
  }

  private joinReadingListWithPapers(taskId: string, result: RelatedLinksResult): ReadingListRecord[] {
    const papersBySourceId = new Map(result.papers.map((paper) => [paper.sourceId, paper]))
    const readingList: ReadingListRecord[] = []

    for (const entry of result.readingList) {
      const paper = papersBySourceId.get(entry.sourceId)
      if (!paper) {
        this.logger.warn(
          `Related links run ${taskId} returned reading-list paper ${entry.sourceId} without its details, skipped`,
          RelatedLinksHandler.name,
        )
        continue
      }

      readingList.push({
        rank: entry.rank,
        sourceId: entry.sourceId,
        reason: entry.reason,
        title: paper.title,
        authors: paper.authors,
        year: paper.year,
        venue: paper.venue,
        doi: paper.doi,
        paperUrl: paper.paperUrl,
        citedByCount: paper.citedByCount,
      })
    }

    return readingList
  }
}
