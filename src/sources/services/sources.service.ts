import { randomUUID } from 'node:crypto'
import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common'
import {
  AI_RUN_KIND,
  AI_RUN_STATUS,
  AI_SERVICE_UNAVAILABLE_MESSAGE,
  type AskSourceQuestionDto,
  type ClassificationHistoryEntry,
  type ClassifySourceDto,
  type ExcludeSourceDto,
  INVALID_CURSOR_MESSAGE,
  type ListSourceQuestionsQuery,
  type ListSourcesQuery,
  REQUIRE_RECLASSIFY_REASON,
  RESEARCH_STATUS,
  SOURCE_EXCLUDED_MESSAGE,
  SOURCE_LOCKED_MESSAGE,
  SOURCE_NOT_FOUND_MESSAGE,
  SOURCE_RECLASSIFY_REASON_REQUIRED_MESSAGE,
  SOURCE_RESOLUTION,
  SOURCE_VERIFY_NEEDS_CLASSIFICATION_MESSAGE,
  SOURCE_VERIFY_NEEDS_RESOLUTION_MESSAGE,
  type Source,
  type SourceQuestion,
  type SourceQuestionAccepted,
  type SourceQuestionAnswer,
} from '@moderta/api-contracts/gaia'
import { AI_CLIENT, type AiClient } from '@/ai/interfaces/ai-client.interface'
import { decodeCursor, toRecordPage } from '@/common/database/cursor-pagination'
import { TRANSACTION_RUNNER, type TransactionRunner } from '@/common/database/transaction-runner'
import type { RepositoryOptions } from '@/common/database/repository-options'
import { ValidationFailedException } from '@/common/http/api-exception'
import { type ListResult, paginated } from '@/common/http/response-results'
import { ResearchAccess } from '@/research/services/research-access.service'
import { SOURCES_REPOSITORY, type SourceRecord } from '@/sources/interfaces/sources-repository.interface'
import { SourcesRepository } from '@/sources/repositories/sources.repository'
import { toClassificationHistoryEntry, toSource, toSourceQuestion } from '@/sources/utils/source-mapper'

@Injectable()
export class SourcesService {
  private readonly logger = new Logger(SourcesService.name)

  constructor(
    @Inject(SOURCES_REPOSITORY) private readonly repository: SourcesRepository,
    @Inject(TRANSACTION_RUNNER) private readonly transactions: TransactionRunner,
    @Inject(ResearchAccess) private readonly research: ResearchAccess,
    @Inject(AI_CLIENT) private readonly ai: AiClient,
  ) { }

  async list(userId: string, researchId: string, query: ListSourcesQuery): Promise<Source[]> {
    await this.research.assertVisible(userId, researchId)

    const records = await this.repository.findAll(researchId, query)
    return records.map(toSource)
  }

  async get(userId: string, researchId: string, sourceId: string): Promise<Source> {
    await this.research.assertVisible(userId, researchId)

    return toSource(await this.findOrThrow(researchId, sourceId))
  }

  classify(userId: string, researchId: string, sourceId: string, dto: ClassifySourceDto): Promise<Source> {
    return this.mutate(userId, researchId, sourceId, async (source, options) => {
      this.assertIncluded(source)

      if (source.stance === dto.stance) return toSource(source)

      const isReclassification = source.stance !== null
      if (isReclassification && REQUIRE_RECLASSIFY_REASON && !dto.reason) {
        throw new ValidationFailedException({ reason: [SOURCE_RECLASSIFY_REASON_REQUIRED_MESSAGE] })
      }

      await this.repository.setStance(researchId, sourceId, dto.stance, userId, options)
      await this.repository.addClassificationEntry(
        { researchId, sourceId, fromStance: source.stance, toStance: dto.stance, reason: dto.reason ?? null, changedBy: userId },
        options,
      )
      if (source.isVerified) await this.research.adjustSourceCounters(researchId, { verified: -1 }, options)

      return toSource(await this.findOrThrow(researchId, sourceId, options))
    })
  }

  verify(userId: string, researchId: string, sourceId: string): Promise<Source> {
    return this.mutate(userId, researchId, sourceId, async (source, options) => {
      if (source.isVerified) return toSource(source)

      this.assertIncluded(source)

      if (!source.stance) throw new UnprocessableEntityException(SOURCE_VERIFY_NEEDS_CLASSIFICATION_MESSAGE)
      if (source.resolution !== SOURCE_RESOLUTION.RESOLVED) throw new UnprocessableEntityException(SOURCE_VERIFY_NEEDS_RESOLUTION_MESSAGE)

      await this.repository.markVerified(researchId, sourceId, userId, options)
      await this.research.adjustSourceCounters(researchId, { verified: 1 }, options)

      return toSource(await this.findOrThrow(researchId, sourceId, options))
    })
  }

  exclude(userId: string, researchId: string, sourceId: string, dto: ExcludeSourceDto): Promise<Source> {
    return this.mutate(userId, researchId, sourceId, async (source, options) => {
      if (!source.includedInResearch) return toSource(source)

      await this.repository.markExcluded(researchId, sourceId, dto.reason ?? null, userId, options)
      await this.research.adjustSourceCounters(
        researchId,
        { excluded: 1, included: -1, verified: source.isVerified ? -1 : 0 },
        options,
      )

      return toSource(await this.findOrThrow(researchId, sourceId, options))
    })
  }

  async classificationHistory(userId: string, researchId: string, sourceId: string): Promise<ClassificationHistoryEntry[]> {
    await this.research.assertVisible(userId, researchId)
    await this.findOrThrow(researchId, sourceId)

    const records = await this.repository.findClassificationHistory(researchId, sourceId)
    return records.map(toClassificationHistoryEntry)
  }


  async ask(userId: string, researchId: string, sourceId: string, dto: AskSourceQuestionDto): Promise<SourceQuestionAccepted> {
    const research = await this.research.assertVisible(userId, researchId)
    const source = toSource(await this.findOrThrow(researchId, sourceId))

    const questionId = await this.repository.addQuestion(researchId, sourceId, userId, dto.question)
    const runId = randomUUID()

    let answer: SourceQuestionAnswer
    try {
      answer = await this.ai.answerSourceQuestion({
        question: dto.question,
        source,
        research: { title: research.title, description: research.description, scopeNotes: research.scopeNotes },
      })
    } catch (error) {
      this.logger.error(`Source question ${questionId} failed`, error instanceof Error ? error.stack : String(error))
      await this.repository.markQuestionFailed(researchId, sourceId, questionId)
      throw new ServiceUnavailableException(AI_SERVICE_UNAVAILABLE_MESSAGE)
    }

    await this.repository.addAnswer(researchId, sourceId, { questionId, llmRunId: runId, ...answer })

    return { questionId, run: { id: runId, kind: AI_RUN_KIND.SOURCE_QUESTION, status: AI_RUN_STATUS.SUCCEEDED } }
  }

  async questions(
    userId: string,
    researchId: string,
    sourceId: string,
    query: ListSourceQuestionsQuery,
  ): Promise<ListResult<SourceQuestion>> {
    const { cursor, limit } = query
    const after = cursor ? decodeCursor(cursor) : null
    if (cursor && !after) throw new ValidationFailedException({ cursor: [INVALID_CURSOR_MESSAGE] })

    await this.research.assertVisible(userId, researchId)
    await this.findOrThrow(researchId, sourceId)

    const page = toRecordPage(await this.repository.findQuestionsPage(researchId, sourceId, { after, limit }), limit)
    return paginated<SourceQuestion>({ items: page.records.map(toSourceQuestion), nextCursor: page.nextCursor }, limit)
  }

  private mutate<T>(
    userId: string,
    researchId: string,
    sourceId: string,
    work: (source: SourceRecord, options: RepositoryOptions) => Promise<T>,
  ): Promise<T> {
    return this.transactions.run(async (options) => {
      const research = await this.research.assertVisible(userId, researchId, options)
      if (research.status === RESEARCH_STATUS.VERIFIED) throw new ConflictException(SOURCE_LOCKED_MESSAGE)

      return work(await this.findOrThrow(researchId, sourceId, options), options)
    })
  }

  private async findOrThrow(researchId: string, sourceId: string, options: RepositoryOptions = {}): Promise<SourceRecord> {
    const record = await this.repository.findById(researchId, sourceId, options)
    if (!record) throw new NotFoundException(SOURCE_NOT_FOUND_MESSAGE)

    return record
  }

  private assertIncluded(source: SourceRecord): void {
    if (!source.includedInResearch) throw new ConflictException(SOURCE_EXCLUDED_MESSAGE)
  }
}
