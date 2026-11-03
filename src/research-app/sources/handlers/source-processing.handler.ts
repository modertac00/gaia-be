import { Inject, Injectable, type OnModuleInit } from '@nestjs/common'
import {
  AI_RUN_KIND,
  EVIDENCE_STATUS,
  type AiError,
  type SourceProcessingPaperResult,
  type SourceProcessingResult,
} from '@moderta/api-contracts/gaia'
import { AiHandlers, type AiResponseHandler } from '@/ai/ai-handlers'
import { EvidenceExtractionHandler } from '@/research-app/evidence/handlers/evidence-extraction.handler'
import { AppLogger } from '@/log'
import { DocumentReadyHandler } from '@/research-app/sources/handlers/document-ready.handler'
import { SourceClassifiedHandler } from '@/research-app/sources/handlers/source-classified.handler'

const EVIDENCE_ROW_FAILED_CODE = 'evidence_row_failed'

@Injectable()
export class SourceProcessingHandler implements AiResponseHandler<typeof AI_RUN_KIND.SOURCE_PROCESSING>, OnModuleInit {
  readonly kind = AI_RUN_KIND.SOURCE_PROCESSING

  constructor(
    @Inject(AiHandlers) private readonly handlers: AiHandlers,
    @Inject(DocumentReadyHandler) private readonly documentReady: DocumentReadyHandler,
    @Inject(SourceClassifiedHandler) private readonly sourceClassified: SourceClassifiedHandler,
    @Inject(EvidenceExtractionHandler) private readonly evidenceExtraction: EvidenceExtractionHandler,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) { }

  onModuleInit(): void {
    this.handlers.register(this)
  }

  async onSucceeded(taskId: string, result: SourceProcessingResult): Promise<void> {
    // Warnings (including related_links_failed) are problems of single papers or of the links; none of them stops the rest.
    for (const warning of result.warnings) {
      const paperLabel = warning.paperId ? ` (paper ${warning.paperId})` : ''
      this.logger.warn(
        `Source processing ${taskId} warned ${warning.code}: ${warning.title}${paperLabel}`,
        SourceProcessingHandler.name,
      )
    }

    for (const paper of result.papers) {
      await this.applyPaper(taskId, result.researchId, paper)
    }
  }

  onFailed(taskId: string, error: AiError, researchId?: string): Promise<void> {
    const researchLabel = researchId ? researchId : 'unknown'
    this.logger.warn(`Source processing ${taskId} failed (${error.code}) for research ${researchLabel}`, SourceProcessingHandler.name)
    return Promise.resolve()
  }

  private async applyPaper(taskId: string, researchId: string, paper: SourceProcessingPaperResult): Promise<void> {
    const { paperId, document, classification, evidence } = paper

    await this.documentReady.onSucceeded(taskId, { researchId, paperId, ...document })

    if (classification) {
      await this.sourceClassified.onSucceeded(taskId, { researchId, paperId, ...classification })
    }

    if (!evidence) return

    if (evidence.status === EVIDENCE_STATUS.FAILED) {
      const error: AiError = {
        code: EVIDENCE_ROW_FAILED_CODE,
        message: `Evidence extraction failed for paper ${paperId}`,
        details: { rowId: evidence.rowId, paperId, reason: evidence.reason },
      }
      await this.evidenceExtraction.onFailed(taskId, error, researchId)
      return
    }

    await this.evidenceExtraction.onSucceeded(taskId, {
      researchId,
      paperId,
      rowId: evidence.rowId,
      study: evidence.study,
      method: evidence.method,
      sample: evidence.sample,
      reportedError: evidence.reportedError,
      locator: evidence.locator,
    })
  }
}
