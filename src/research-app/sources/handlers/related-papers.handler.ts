import { Inject, Injectable, type OnModuleInit } from '@nestjs/common'
import { AI_RUN_KIND, type AiError, type RelatedPaperResult, type RelatedPapersResult } from '@moderta/api-contracts/gaia'
import { AiHandlers, type AiResponseHandler } from '@/ai/ai-handlers'
import { TRANSACTION_RUNNER, type TransactionRunner } from '@/common/database/transaction-runner'
import { AppLogger } from '@/log'
import { SOURCES_REPOSITORY, type AiPaper } from '@/research-app/sources/interfaces/sources-repository.interface'
import { SourcesRepository } from '@/research-app/sources/repositories/sources.repository'
import { tierFromReliability } from '@/research-app/sources/utils/paper-tier'

/** The AI selected the papers of a research. Each paper becomes a source whose id is the AI's paperId. */
@Injectable()
export class RelatedPapersHandler implements AiResponseHandler<typeof AI_RUN_KIND.RELATED_PAPERS>, OnModuleInit {
  readonly kind = AI_RUN_KIND.RELATED_PAPERS

  constructor(
    @Inject(AiHandlers) private readonly handlers: AiHandlers,
    @Inject(SOURCES_REPOSITORY) private readonly repository: SourcesRepository,
    @Inject(TRANSACTION_RUNNER) private readonly transactions: TransactionRunner,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) { }

  onModuleInit(): void {
    this.handlers.register(this)
  }

  onSucceeded(taskId: string, result: RelatedPapersResult): Promise<void> {
    return this.transactions.run(async (options) => {
      const { researchId } = result

      const createdBy = await this.repository.lockResearchCreator(researchId, options)
      if (createdBy === null) {
        this.logger.warn(`Related papers run ${taskId} is for unknown research ${researchId}`, RelatedPapersHandler.name)
        return
      }

      for (const paper of result.papers) {
        await this.repository.saveAiPaper(researchId, toAiPaper(paper), createdBy, options)
      }
    })
  }

  onFailed(taskId: string, error: AiError, researchId?: string): Promise<void> {
    const researchLabel = researchId ? researchId : 'unknown'
    this.logger.warn(`Related papers run ${taskId} failed (${error.code}) for research ${researchLabel}`, RelatedPapersHandler.name)
    return Promise.resolve()
  }
}

function toAiPaper(paper: RelatedPaperResult): AiPaper {
  return {
    id: paper.paperId,
    marker: paper.marker,
    title: paper.title,
    authors: paper.authors,
    venue: paper.venue,
    publicationYear: paper.year,
    doi: paper.doi,
    url: paper.paperUrl,
    citedByCount: paper.citedByCount === null ? 0 : paper.citedByCount,
    tier: tierFromReliability(paper.reliability),
  }
}
