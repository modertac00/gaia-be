import { Inject, Injectable } from '@nestjs/common'
import type { ResearchLink } from '@moderta/api-contracts/gaia'
import { ListResult } from '@/common/http/response-results'
import { RESEARCH_LINKS_REPOSITORY } from '@/research-app/research-links/interfaces/research-links-repository.interface'
import { ResearchLinksRepository } from '@/research-app/research-links/repositories/research-links.repository'
import { toResearchLink } from '@/research-app/research-links/utils/research-link-mapper'
import { ResearchAccess } from '@/research-app/research/services/research-access.service'

@Injectable()
export class ResearchLinksService {
  constructor(
    @Inject(RESEARCH_LINKS_REPOSITORY) private readonly repository: ResearchLinksRepository,
    @Inject(ResearchAccess) private readonly research: ResearchAccess,
  ) { }

  async list(userId: string, researchId: string): Promise<ListResult<ResearchLink>> {
    await this.research.assertVisible(userId, researchId)

    const records = await this.repository.findAll(researchId)
    const links = records.map(toResearchLink)

    return new ListResult(links, links.length, null)
  }
}
