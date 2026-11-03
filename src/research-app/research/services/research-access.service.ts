import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { RESEARCH_NOT_FOUND_MESSAGE } from '@moderta/api-contracts/gaia'
import type { RepositoryOptions } from '@/common/database/repository-options'
import { RESEARCH_REPOSITORY, type ResearchRecord, type SourceCounterDeltas } from '@/research-app/research/interfaces/research-repository.interface'
import { ResearchRepository } from '@/research-app/research/repositories/research.repository'

@Injectable()
export class ResearchAccess {
  constructor(@Inject(RESEARCH_REPOSITORY) private readonly repository: ResearchRepository) { }

  async assertVisible(userId: string, researchId: string, options: RepositoryOptions = {}): Promise<ResearchRecord> {
    const record = await this.repository.findVisibleById(researchId, userId, options)
    if (!record) throw new NotFoundException(RESEARCH_NOT_FOUND_MESSAGE)

    return record
  }

  adjustSourceCounters(researchId: string, deltas: SourceCounterDeltas, options: RepositoryOptions = {}): Promise<void> {
    return this.repository.adjustSourceCounters(researchId, deltas, options)
  }
}
