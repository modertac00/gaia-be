import { randomUUID } from 'node:crypto'
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  AI_RUN_KIND,
  type CreateResearchDto,
  FORBIDDEN_MESSAGE,
  INVALID_CURSOR_MESSAGE,
  type ListResearchQuery,
  RESEARCH_STATUS,
  RESEARCH_NOT_EDITABLE_MESSAGE,
  RESEARCH_NOT_FOUND_MESSAGE,
  RESEARCH_VALIDATION_MESSAGES,
  type Research,
  type UpdateResearchDto,
} from '@moderta/api-contracts/gaia'
import { AiTasks } from '@/ai/ai-tasks.service'
import { decodeCursor, toRecordPage } from '@/common/database/cursor-pagination'
import { TRANSACTION_RUNNER, type TransactionRunner } from '@/common/database/transaction-runner'
import { ValidationFailedException } from '@/common/http/api-exception'
import { ListResult, paginated } from '@/common/http/response-results'
import { AppLogger } from '@/log'
import { type CreatedNote, NoteCreator } from '@/research-app/notes/services/note-creator.service'
import { RESEARCH_REPOSITORY } from '@/research-app/research/interfaces/research-repository.interface'
import { toClarificationAnswers } from '@/research-app/research/utils/clarification-answers'
import { toResearch } from '@/research-app/research/utils/research-mapper'
import { ResearchRepository } from '@/research-app/research/repositories/research.repository'

@Injectable()
export class ResearchService {
  constructor(
    @Inject(RESEARCH_REPOSITORY) private readonly repository: ResearchRepository,
    @Inject(TRANSACTION_RUNNER) private readonly transactions: TransactionRunner,
    @Inject(NoteCreator) private readonly noteCreator: NoteCreator,
    @Inject(AiTasks) private readonly ai: AiTasks,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) { }

  async create(userId: string, dto: CreateResearchDto): Promise<Research> {
    const { supervisorIds, isDraft, description, clarification, ...fields } = dto

    const { research, note } = await this.transactions.run(async (options) => {
      const created = await this.repository.create(
        {
          ...fields,
          description: description ?? null,
          clarification: clarification ?? null,
          createdBy: userId,
          status: isDraft ? RESEARCH_STATUS.DRAFT : RESEARCH_STATUS.VERIFICATION_REQUIRED,
        },
        options,
      )
      await this.repository.replaceSupervisors(created.id, userId, supervisorIds, options)

      let createdNote: CreatedNote | null = null
      if (!isDraft) {
        createdNote = await this.noteCreator.createInitialNote(created.id, userId, options)
      }

      return { research: toResearch({ ...created, supervisorIds }), note: createdNote }
    })

    if (note) {
      await this.sendResearchCreated(research, note)
    }

    return research
  }

  async list(userId: string, query: ListResearchQuery): Promise<ListResult<Research>> {
    const { cursor, limit, ...filter } = query
    const after = cursor ? decodeCursor(cursor) : null
    if (cursor && !after) {
      throw new ValidationFailedException({ cursor: [INVALID_CURSOR_MESSAGE] })
    }

    const records = await this.repository.findVisiblePage(userId, filter, { after, limit })
    const page = toRecordPage(records, limit)

    return paginated<Research>({ items: page.records.map(toResearch), nextCursor: page.nextCursor }, limit)
  }

  async get(userId: string, researchId: string): Promise<Research> {
    const record = await this.repository.findVisibleById(researchId, userId)
    if (!record) throw new NotFoundException(RESEARCH_NOT_FOUND_MESSAGE)

    return toResearch(record)
  }

  update(userId: string, researchId: string, dto: UpdateResearchDto): Promise<Research> {
    const { supervisorIds, ...changes } = dto

    return this.transactions.run(async (options) => {

      const owned = await this.repository.findOwnedById(researchId, userId, options)

      if (!owned) {
        const visible = await this.repository.findVisibleById(researchId, userId, options)
        if (visible) throw new ForbiddenException(FORBIDDEN_MESSAGE)
        throw new NotFoundException(RESEARCH_NOT_FOUND_MESSAGE)
      }

      if (owned.status !== RESEARCH_STATUS.DRAFT) throw new ConflictException(RESEARCH_NOT_EDITABLE_MESSAGE)

      const from = changes.pubYearFrom ?? owned.pubYearFrom
      const to = changes.pubYearTo ?? owned.pubYearTo

      if (from > to) {
        throw new ValidationFailedException({ pubYearFrom: [RESEARCH_VALIDATION_MESSAGES.PUB_YEAR_ORDER] })
      }

      await this.repository.update(researchId, userId, changes, options)
      if (supervisorIds && !(await this.repository.replaceSupervisors(researchId, userId, supervisorIds, options))) {
        throw new NotFoundException(RESEARCH_NOT_FOUND_MESSAGE)
      }

      const updated = await this.repository.findOwnedById(researchId, userId, options)
      if (!updated) throw new NotFoundException(RESEARCH_NOT_FOUND_MESSAGE)
      return toResearch(updated)
    })
  }

  /** The research is already saved, so a failure to reach the AI is logged and does not fail the request. */
  private async sendResearchCreated(research: Research, note: CreatedNote): Promise<void> {
    try {
      await this.ai.send({
        kind: AI_RUN_KIND.RESEARCH_CREATED,
        taskId: randomUUID(),
        input: {
          researchId: research.id,
          question: research.title,
          researchType: research.researchType,
          citationStyle: research.citationStyle,
          publicationYearFrom: research.pubYearFrom,
          publicationYearTo: research.pubYearTo,
          minSources: research.minSources,
          clarifications: toClarificationAnswers(research.clarification),
          noteId: note.id,
          sections: note.sections.map(({ id, type, heading }) => ({ id, type, heading })),
        },
      })
    } catch (error) {
      this.logger.error(
        `Could not start the research_created AI task for research ${research.id}: ${String(error)}`,
        error instanceof Error ? error.stack : undefined,
        ResearchService.name,
      )
    }
  }
}
