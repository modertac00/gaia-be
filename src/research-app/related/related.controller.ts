import { Controller, Get, Inject, Param } from '@nestjs/common'
import { type RelatedPapers, type ResearchIdParam, researchIdParamSchema } from '@moderta/api-contracts/gaia'
import { CurrentUser } from '@/common/auth'
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe'
import { RelatedService } from '@/research-app/related/services/related.service'
import { ApiGetRelatedPapers, ApiRelatedController } from './related.swagger'

@ApiRelatedController()
@Controller('research/:researchId/related')
export class RelatedController {
  constructor(@Inject(RelatedService) private readonly relatedService: RelatedService) { }

  @ApiGetRelatedPapers()
  @Get()
  get(
    @CurrentUser('id') userId: string,
    @Param(new ZodValidationPipe(researchIdParamSchema)) params: ResearchIdParam,
  ): Promise<RelatedPapers> {
    return this.relatedService.get(userId, params.researchId)
  }
}
