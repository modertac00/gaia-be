import { randomUUID } from 'node:crypto'
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  AI_RUN_KIND,
  RESEARCH_STATUS,
  SOURCE_LOCKED_MESSAGE,
  SOURCE_NOT_FOUND_MESSAGE,
  SOURCE_TIER,
  type ReadingListPaperAccepted,
  type RelatedPapers,
  type SourceProcessingTaskInput,
} from '@moderta/api-contracts/gaia'
import { AiTasks } from '@/ai/ai-tasks.service'
import { TRANSACTION_RUNNER, type TransactionRunner } from '@/common/database/transaction-runner'
import { RELATED_REPOSITORY, type ReadingListRecord } from '@/research-app/related/interfaces/related-repository.interface'
import { RelatedRepository } from '@/research-app/related/repositories/related.repository'
import { toRelatedPapers } from '@/research-app/related/utils/related-mapper'
import { ResearchAccess } from '@/research-app/research/services/research-access.service'
import { type AiPaper, SOURCES_REPOSITORY } from '@/research-app/sources/interfaces/sources-repository.interface'
import { SourcesRepository } from '@/research-app/sources/repositories/sources.repository'

@Injectable()
export class RelatedService {
  constructor(
    @Inject(RELATED_REPOSITORY) private readonly repository: RelatedRepository,
    @Inject(SOURCES_REPOSITORY) private readonly sources: SourcesRepository,
    @Inject(TRANSACTION_RUNNER) private readonly transactions: TransactionRunner,
    @Inject(ResearchAccess) private readonly research: ResearchAccess,
    @Inject(AiTasks) private readonly ai: AiTasks,
  ) { }

  async get(userId: string, researchId: string): Promise<RelatedPapers> {
    await this.research.assertVisible(userId, researchId)

    const sourceIds = await this.repository.findResearchSourceIds(researchId)
    const allLinks = await this.repository.findLinks(researchId)
    const links = allLinks.filter((link) => sourceIds.includes(link.fromSourceId) && sourceIds.includes(link.toSourceId))
    const readingList = await this.repository.findReadingList(researchId)
    const timeline = await this.repository.countIncludedByYear(researchId)

    return toRelatedPapers(links, readingList, timeline)
  }

  addReadingListPaper(userId: string, researchId: string, sourceId: string): Promise<ReadingListPaperAccepted> {
    return this.transactions.run(async (options) => {
      const research = await this.research.assertVisible(userId, researchId, options)
      if (research.status === RESEARCH_STATUS.VERIFIED) throw new ConflictException(SOURCE_LOCKED_MESSAGE)

      await this.repository.lockResearch(researchId, options)

      const entry = await this.repository.findReadingListEntry(researchId, sourceId, options)
      if (!entry) throw new NotFoundException(SOURCE_NOT_FOUND_MESSAGE)

      const marker = await this.sources.nextMarker(researchId, options)
      await this.sources.saveAiPaper(researchId, toAiPaper(entry, marker), userId, options)
      await this.repository.deleteReadingListEntry(researchId, sourceId, options)
      await this.research.adjustSourceCounters(researchId, { included: 1 }, options)

      const run = await this.ai.send(
        {
          kind: AI_RUN_KIND.SOURCE_PROCESSING,
          taskId: randomUUID(),
          input: toSourceProcessingInput(researchId, entry, marker),
        },
        researchId,
        options,
      )

      return { sourceId, run }
    })
  }
}

function toAiPaper(entry: ReadingListRecord, marker: number): AiPaper {
  return {
    id: entry.sourceId,
    marker,
    title: entry.title,
    authors: entry.authors,
    venue: entry.venue,
    publicationYear: entry.year,
    doi: entry.doi,
    url: entry.paperUrl,
    citedByCount: entry.citedByCount === null ? 0 : entry.citedByCount,
    tier: SOURCE_TIER.OTHER,
  }
}

/** The AI keeps its own values for details we leave out, so empty ones are not sent. */
function toSourceProcessingInput(researchId: string, entry: ReadingListRecord, marker: number): SourceProcessingTaskInput {
  const paper: SourceProcessingTaskInput['papers'][number] = {
    paperId: entry.sourceId,
    rowId: randomUUID(),
    marker,
    title: entry.title,
    authors: entry.authors,
  }
  if (entry.doi !== null) paper.doi = entry.doi
  if (entry.venue !== null) paper.venue = entry.venue
  if (entry.year !== null) paper.year = entry.year

  return { researchId, papers: [paper] }
}
