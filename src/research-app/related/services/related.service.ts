import { Inject, Injectable } from '@nestjs/common'
import type { RelatedPapers } from '@moderta/api-contracts/gaia'
import { RELATED_REPOSITORY } from '@/research-app/related/interfaces/related-repository.interface'
import { RelatedRepository } from '@/research-app/related/repositories/related.repository'
import { toRelatedPapers } from '@/research-app/related/utils/related-mapper'
import { ResearchAccess } from '@/research-app/research/services/research-access.service'

@Injectable()
export class RelatedService {
  constructor(
    @Inject(RELATED_REPOSITORY) private readonly repository: RelatedRepository,
    @Inject(ResearchAccess) private readonly research: ResearchAccess,
  ) { }

  async get(userId: string, researchId: string): Promise<RelatedPapers> {
    await this.research.assertVisible(userId, researchId)

    const links = await this.repository.findLinks(researchId)
    const readingList = await this.repository.findReadingList(researchId)
    const timeline = await this.repository.countIncludedByYear(researchId)

    return toRelatedPapers(links, readingList, timeline)
  }
}
