import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { AI_RUN_NOT_FOUND_MESSAGE, type AiRun, INVALID_CURSOR_MESSAGE, type ListAiRunsQuery } from '@moderta/api-contracts/gaia'
import { AI_RUNS_REPOSITORY } from '@/ai/runs/ai-runs-repository.interface'
import { AiRunsRepository } from '@/ai/runs/ai-runs.repository'
import { decodeCursor, toRecordPage } from '@/common/database/cursor-pagination'
import { ValidationFailedException } from '@/common/http/api-exception'
import { type ListResult, paginated } from '@/common/http/response-results'
import { toAiRun } from '@/research-app/ai-runs/utils/ai-run-mapper'
import { ResearchAccess } from '@/research-app/research/services/research-access.service'

@Injectable()
export class AiRunsService {
  constructor(
    @Inject(AI_RUNS_REPOSITORY) private readonly repository: AiRunsRepository,
    @Inject(ResearchAccess) private readonly research: ResearchAccess,
  ) { }

  async list(userId: string, researchId: string, query: ListAiRunsQuery): Promise<ListResult<AiRun>> {
    const { cursor, limit, kind, status } = query
    const after = cursor ? decodeCursor(cursor) : null
    if (cursor && !after) throw new ValidationFailedException({ cursor: [INVALID_CURSOR_MESSAGE] })

    await this.research.assertVisible(userId, researchId)

    const records = await this.repository.findPage(researchId, { kind, status }, { after, limit })
    const page = toRecordPage(records, limit)
    return paginated<AiRun>({ items: page.records.map(toAiRun), nextCursor: page.nextCursor }, limit)
  }

  async get(userId: string, researchId: string, runId: string): Promise<AiRun> {
    await this.research.assertVisible(userId, researchId)

    const record = await this.repository.findOne(researchId, runId)
    if (!record) throw new NotFoundException(AI_RUN_NOT_FOUND_MESSAGE)

    return toAiRun(record)
  }
}
