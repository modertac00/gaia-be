import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  type CreateResearchDto,
  FORBIDDEN_MESSAGE,
  INVALID_CURSOR_MESSAGE,
  type ListResearchQuery,
  RESEARCH_STATUS,
  RESEARCH_NOT_EDITABLE_MESSAGE,
  RESEARCH_NOT_FOUND_MESSAGE,
  RESEARCH_VALIDATION_MESSAGES,
  type Research,
  type ResearchPage,
  type UpdateResearchDto,
} from '@moderta/api-contracts/gaia'
import { decodeCursor, toRecordPage } from '@/common/database/cursor-pagination'
import { TRANSACTION_RUNNER, type TransactionRunner } from '@/common/database/transaction-runner'
import { VALIDATION_FAILED_MESSAGE } from '@/common/pipes/zod-validation.pipe'
import { RESEARCH_REPOSITORY } from '@/research/interfaces/research-repository.interface'
import { toResearch } from '@/research/utils/research-mapper'
import { ResearchRepository } from '@/research/repositories/research.repository'

@Injectable()
export class ResearchService {
  constructor(
    @Inject(RESEARCH_REPOSITORY) private readonly repository: ResearchRepository,
    @Inject(TRANSACTION_RUNNER) private readonly transactions: TransactionRunner,
  ) { }

  create(userId: string, dto: CreateResearchDto): Promise<Research> {
    const { supervisorIds, isDraft, description, clarification, ...fields } = dto

    return this.transactions.run(async (options) => {
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

      return toResearch({ ...created, supervisorIds })
    })
  }

  async list(userId: string, query: ListResearchQuery): Promise<ResearchPage> {
    const { cursor, limit, ...filter } = query
    const after = cursor ? decodeCursor(cursor) : null
    if (cursor && !after) {
      throw new BadRequestException({
        message: VALIDATION_FAILED_MESSAGE,
        errors: { cursor: [INVALID_CURSOR_MESSAGE] },
      })
    }

    const records = await this.repository.findVisiblePage(userId, filter, { after, limit })
    const page = toRecordPage(records, limit)

    return { items: page.records.map(toResearch), nextCursor: page.nextCursor }
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
        throw new BadRequestException({
          message: VALIDATION_FAILED_MESSAGE,
          errors: { pubYearFrom: [RESEARCH_VALIDATION_MESSAGES.PUB_YEAR_ORDER] },
        })
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
}
