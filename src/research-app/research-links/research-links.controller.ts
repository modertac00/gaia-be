import { Controller, Get, Inject, Param } from '@nestjs/common'
import { type ResearchIdParam, type ResearchLink, researchIdParamSchema } from '@moderta/api-contracts/gaia'
import { CurrentUser } from '@/common/auth'
import type { ListResult } from '@/common/http/response-results'
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe'
import { ResearchLinksService } from '@/research-app/research-links/services/research-links.service'
import { ApiListResearchLinks, ApiResearchLinksController } from './research-links.swagger'

@ApiResearchLinksController()
@Controller('research/:researchId/links')
export class ResearchLinksController {
  constructor(@Inject(ResearchLinksService) private readonly researchLinksService: ResearchLinksService) { }

  @ApiListResearchLinks()
  @Get()
  list(
    @CurrentUser('id') userId: string,
    @Param(new ZodValidationPipe(researchIdParamSchema)) params: ResearchIdParam,
  ): Promise<ListResult<ResearchLink>> {
    return this.researchLinksService.list(userId, params.researchId)
  }
}
