import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import {
  ACTIVITY_ACTOR_TYPE,
  ACTIVITY_RESULT,
  ACTIVITY_TARGET_TYPE,
  ACTIVITY_TOOL,
  AI_RUN_KIND,
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
  SOURCE_STANCES,
  SOURCE_VERIFY_NEEDS_CLASSIFICATION_MESSAGE,
  SOURCE_VERIFY_NEEDS_RESOLUTION_MESSAGE,
  type Source,
  type SourceQuestion,
  type SourceQuestionAccepted,
  type SourceStance,
} from '@moderta/api-contracts/gaia'
import { AiTasks } from '@/ai/ai-tasks.service'
import { decodeCursor, toRecordPage } from '@/common/database/cursor-pagination'
import { TRANSACTION_RUNNER, type TransactionRunner } from '@/common/database/transaction-runner'
import type { RepositoryOptions } from '@/common/database/repository-options'
import { ValidationFailedException } from '@/common/http/api-exception'
import { type ListResult, paginated } from '@/common/http/response-results'
import { ActivityRecorder } from '@/research-app/audit/services/activity-recorder.service'
import type { ResearchRecord } from '@/research-app/research/interfaces/research-repository.interface'
import { ResearchAccess } from '@/research-app/research/services/research-access.service'
import { SOURCES_REPOSITORY, type SourceRecord } from '@/research-app/sources/interfaces/sources-repository.interface'
import { SourcesRepository } from '@/research-app/sources/repositories/sources.repository'
import { toClassificationHistoryEntry, toSource, toSourceQuestion } from '@/research-app/sources/utils/source-mapper'

function stanceLabel(stance: SourceStance): string {
  return SOURCE_STANCES.find((item) => item.value === stance)?.label ?? stance
}

@Injectable()
export class SourcesService {
  constructor(
    @Inject(SOURCES_REPOSITORY) private readonly repository: SourcesRepository,
    @Inject(TRANSACTION_RUNNER) private readonly transactions: TransactionRunner,
    @Inject(ResearchAccess) private readonly research: ResearchAccess,
    @Inject(AiTasks) private readonly ai: AiTasks,
    @Inject(ActivityRecorder) private readonly activity: ActivityRecorder,
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
    return this.mutate(userId, researchId, sourceId, async (source, options, research) => {
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

      const to = stanceLabel(dto.stance)
      const action = source.stance
        ? `Source ${source.marker} reclassified ${stanceLabel(source.stance)} → ${to}`
        : `Source ${source.marker} classified as ${to}`
      await this.recordActivity(userId, research, source, action, options, dto.reason)

      return toSource(await this.findOrThrow(researchId, sourceId, options))
    })
  }

  verify(userId: string, researchId: string, sourceId: string): Promise<Source> {
    return this.mutate(userId, researchId, sourceId, async (source, options, research) => {
      if (source.isVerified) return toSource(source)

      this.assertIncluded(source)

      if (!source.stance) throw new UnprocessableEntityException(SOURCE_VERIFY_NEEDS_CLASSIFICATION_MESSAGE)
      if (source.resolution !== SOURCE_RESOLUTION.RESOLVED) throw new UnprocessableEntityException(SOURCE_VERIFY_NEEDS_RESOLUTION_MESSAGE)

      await this.repository.markVerified(researchId, sourceId, userId, options)
      await this.research.adjustSourceCounters(researchId, { verified: 1 }, options)
      await this.recordActivity(userId, research, source, `Source ${source.marker} verified`, options)

      return toSource(await this.findOrThrow(researchId, sourceId, options))
    })
  }

  exclude(userId: string, researchId: string, sourceId: string, dto: ExcludeSourceDto): Promise<Source> {
    return this.mutate(userId, researchId, sourceId, async (source, options, research) => {
      if (!source.includedInResearch) return toSource(source)

      await this.repository.markExcluded(researchId, sourceId, dto.reason ?? null, userId, options)
      await this.research.adjustSourceCounters(
        researchId,
        { excluded: 1, included: -1, verified: source.isVerified ? -1 : 0 },
        options,
      )
      await this.recordActivity(userId, research, source, `Source ${source.marker} excluded`, options, dto.reason)

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

    try {
      const run = await this.ai.send({
        kind: AI_RUN_KIND.SOURCE_QUESTION,
        taskId: questionId,
        input: {
          question: dto.question,
          source,
          research: { title: research.title, description: research.description, scopeNotes: research.scopeNotes },
        },
      })
      return { questionId, run }
    } catch (error) {
      await this.repository.failQuestion(questionId)
      throw error
    }
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
    work: (source: SourceRecord, options: RepositoryOptions, research: ResearchRecord) => Promise<T>,
  ): Promise<T> {
    return this.transactions.run(async (options) => {
      const research = await this.research.assertVisible(userId, researchId, options)
      if (research.status === RESEARCH_STATUS.VERIFIED) throw new ConflictException(SOURCE_LOCKED_MESSAGE)

      return work(await this.findOrThrow(researchId, sourceId, options), options, research)
    })
  }

  private recordActivity(
    userId: string,
    research: ResearchRecord,
    source: SourceRecord,
    action: string,
    options: RepositoryOptions,
    reason?: string,
  ): Promise<void> {
    return this.activity.record(
      {
        researchId: research.id,
        tool: ACTIVITY_TOOL.LITERATURE_REVIEW,
        action,
        targetType: ACTIVITY_TARGET_TYPE.SOURCE,
        targetId: source.id,
        targetLabel: `${research.docKey} · source ${source.marker}`,
        actorType: ACTIVITY_ACTOR_TYPE.USER,
        actorUserId: userId,
        result: ACTIVITY_RESULT.SUCCESS,
        reason,
      },
      options,
    )
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
