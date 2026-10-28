import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import {
  CHAT_ROLE,
  SCREENING_STAGE,
  SOURCE_QUESTION_STATUS,
  sourceContentLevelSchema,
  type SourceQuestionStatus,
  type SourceStance,
} from '@moderta/api-contracts/gaia'
import { literal, Op, type WhereOptions } from 'sequelize'
import { z } from 'zod'
import type { CursorPosition } from '@/common/database/cursor-pagination'
import type { RepositoryOptions } from '@/common/database/repository-options'
import type {
  ClassificationHistoryRecord,
  NewClassificationEntry,
  NewSourceAnswer,
  SourceListFilter,
  SourceQuestionRecord,
  SourceRecord,
} from '@/sources/interfaces/sources-repository.interface'
import { SourceChatModel } from '@/sources/models/source-chat.model'
import { SourceClassificationHistoryModel } from '@/sources/models/source-classification-history.model'
import { SourceScreeningModel } from '@/sources/models/source-screening.model'
import { SourceModel } from '@/sources/models/source.model'

/** What an answer row keeps in its metadata so the question can find it again. */
const answerMetadataSchema = z.object({
  questionId: z.uuid(),
  pages: z.array(z.number().int().positive()),
  contentLevel: sourceContentLevelSchema,
})
type AnswerMetadata = z.infer<typeof answerMetadataSchema>

/** A question with no answer is still waiting, unless its run was marked failed. */
const questionStatusOf = (metadata: Record<string, unknown> | null): SourceQuestionStatus =>
  metadata?.status === SOURCE_QUESTION_STATUS.FAILED ? SOURCE_QUESTION_STATUS.FAILED : SOURCE_QUESTION_STATUS.QUEUED

@Injectable()
export class SourcesRepository {
  constructor(
    @InjectModel(SourceModel) private readonly sourceModel: typeof SourceModel,
    @InjectModel(SourceClassificationHistoryModel) private readonly historyModel: typeof SourceClassificationHistoryModel,
    @InjectModel(SourceScreeningModel) private readonly screeningModel: typeof SourceScreeningModel,
    @InjectModel(SourceChatModel) private readonly chatModel: typeof SourceChatModel,
  ) { }

  async findAll(researchId: string, filter: SourceListFilter): Promise<SourceRecord[]> {
    const where: WhereOptions = { researchId }

    if (filter.stance) Object.assign(where, { classificationType: filter.stance })
    if (filter.verified !== undefined) Object.assign(where, { isVerified: filter.verified })
    if (filter.included !== undefined) Object.assign(where, { includedInResearch: filter.included })

    const rows = await this.sourceModel.findAll({ where, order: [['marker', 'ASC']] })
    return rows.map((row) => this.toRecord(row.get({ plain: true })))
  }

  async findById(researchId: string, sourceId: string, options: RepositoryOptions = {}): Promise<SourceRecord | null> {
    const row = await this.sourceModel.findOne({
      where: { id: sourceId, researchId },
      transaction: options.transaction,
      lock: options.transaction ? options.transaction.LOCK.UPDATE : undefined,
    })
    return row ? this.toRecord(row.get({ plain: true })) : null
  }

  async setStance(researchId: string, sourceId: string, stance: SourceStance, userId: string, options: RepositoryOptions = {}): Promise<void> {
    await this.sourceModel.update(
      { classificationType: stance, classifiedBy: userId, isVerified: false, verifiedBy: null, verifiedAt: null },
      { where: { id: sourceId, researchId }, transaction: options.transaction },
    )
  }

  async addClassificationEntry(entry: NewClassificationEntry, options: RepositoryOptions = {}): Promise<void> {
    await this.historyModel.create(
      {
        researchId: entry.researchId,
        sourceId: entry.sourceId,
        fromClass: entry.fromStance,
        toClass: entry.toStance,
        reason: entry.reason,
        changedBy: entry.changedBy,
      },
      { transaction: options.transaction },
    )
  }

  async markVerified(researchId: string, sourceId: string, userId: string, options: RepositoryOptions = {}): Promise<void> {
    await this.sourceModel.update(
      { isVerified: true, verifiedBy: userId, verifiedAt: new Date() },
      { where: { id: sourceId, researchId }, transaction: options.transaction },
    )
  }

  async markExcluded(researchId: string, sourceId: string, reason: string | null, decidedBy: string, options: RepositoryOptions = {}): Promise<void> {
    await this.sourceModel.update(
      { includedInResearch: false, isVerified: false, verifiedBy: null, verifiedAt: null },
      { where: { id: sourceId, researchId }, transaction: options.transaction },
    )

    const decision = { stage: SCREENING_STAGE.EXCLUDED, exclusionReason: reason, decidedBy }
    const existing = await this.screeningModel.findOne({ where: { researchId, sourceId }, transaction: options.transaction })

    if (existing) await existing.update(decision, { transaction: options.transaction })
    else await this.screeningModel.create({ researchId, sourceId, ...decision }, { transaction: options.transaction })
  }

  async findClassificationHistory(researchId: string, sourceId: string): Promise<ClassificationHistoryRecord[]> {
    const rows = await this.historyModel.findAll({
      where: { researchId, sourceId },
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
    })

    return rows.map((row) => {
      const plain = row.get({ plain: true })
      return {
        id: plain.id,
        sourceId: plain.sourceId,
        fromStance: plain.fromClass,
        toStance: plain.toClass,
        reason: plain.reason,
        changedBy: plain.changedBy,
        createdAt: plain.createdAt,
      }
    })
  }

  /** A question is the person's chat row; its answer is a later assistant row whose metadata points back at it. */
  async addQuestion(researchId: string, sourceId: string, userId: string, question: string): Promise<string> {
    const row = await this.chatModel.create({
      researchId,
      sourceId,
      role: CHAT_ROLE.PERSON,
      message: question,
      userId,
      metadata: { status: SOURCE_QUESTION_STATUS.QUEUED },
    })
    return row.id
  }

  async markQuestionFailed(researchId: string, sourceId: string, questionId: string): Promise<void> {
    await this.chatModel.update(
      { metadata: { status: SOURCE_QUESTION_STATUS.FAILED } },
      { where: { id: questionId, researchId, sourceId, role: CHAT_ROLE.PERSON } },
    )
  }

  async addAnswer(researchId: string, sourceId: string, answer: NewSourceAnswer): Promise<void> {
    const metadata: AnswerMetadata = { questionId: answer.questionId, pages: answer.pages, contentLevel: answer.contentLevel }

    await this.chatModel.create({
      researchId,
      sourceId,
      role: CHAT_ROLE.ASSISTANT,
      message: answer.answer,
      metadata,
      llmRunId: answer.llmRunId,
    })
  }

  /** Newest question first; fetches `limit + 1` so the caller can tell whether another page exists. */
  async findQuestionsPage(
    researchId: string,
    sourceId: string,
    page: { after: CursorPosition | null; limit: number },
  ): Promise<SourceQuestionRecord[]> {
    const conditions: WhereOptions[] = [{ researchId, sourceId, role: CHAT_ROLE.PERSON }]

    if (page.after) {
      const { createdAt, id } = page.after
      conditions.push({ [Op.or]: [{ createdAt: { [Op.lt]: createdAt } }, { createdAt, id: { [Op.lt]: id } }] })
    }

    const questions = await this.chatModel.findAll({
      where: { [Op.and]: conditions },
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
      limit: page.limit + 1,
    })
    if (!questions.length) return []

    const replies = await this.chatModel.findAll({
      where: { researchId, sourceId, role: CHAT_ROLE.ASSISTANT, [Op.and]: literal("metadata->>'questionId' in (:questionIds)") },
      replacements: { questionIds: questions.map((question) => question.id) },
    })
    const answers = new Map<string, { answer: string; metadata: AnswerMetadata }>()
    for (const reply of replies) {
      const parsed = answerMetadataSchema.safeParse(reply.metadata)
      if (parsed.success) answers.set(parsed.data.questionId, { answer: reply.message, metadata: parsed.data })
    }

    return questions.map((row) => {
      const plain = row.get({ plain: true })
      const answered = answers.get(plain.id)

      return {
        id: plain.id,
        question: plain.message,
        answer: answered?.answer ?? null,
        pages: answered?.metadata.pages ?? [],
        contentLevel: answered?.metadata.contentLevel ?? null,
        status: answered ? SOURCE_QUESTION_STATUS.ANSWERED : questionStatusOf(plain.metadata),
        createdAt: plain.createdAt,
      }
    })
  }

  private toRecord(plain: SourceModel): SourceRecord {
    return {
      id: plain.id,
      researchId: plain.researchId,
      marker: plain.marker,
      title: plain.title,
      authors: plain.authors,
      venue: plain.venue,
      publicationYear: plain.publicationYear,
      doi: plain.doi,
      url: plain.url,
      tier: plain.tier,
      citedByCount: plain.citedByCount,
      contentSummarization: plain.contentSummarization,
      stance: plain.classificationType,
      classifiedBy: plain.classifiedBy,
      isVerified: plain.isVerified,
      verifiedBy: plain.verifiedBy,
      verifiedAt: plain.verifiedAt,
      resolution: plain.resolution,
      includedInResearch: plain.includedInResearch,
      createdBy: plain.createdBy,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
    } satisfies SourceRecord
  }
}
