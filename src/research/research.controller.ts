import { Body, Controller, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common'
import {
  type CreateResearchDto,
  createResearchSchema,
  type ListResearchQuery,
  listResearchQuerySchema,
  type Research,
  type ResearchIdParam,
  type ResearchPage,
  researchIdParamSchema,
  type UpdateResearchDto,
  updateResearchSchema,
} from '@moderta/api-contracts/gaia'
import { CurrentUser } from '@/common/auth'
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe'
import { ResearchService } from '@/research/services/research.service'

@Controller('research')
export class ResearchController {
  constructor(@Inject(ResearchService) private readonly researchService: ResearchService) { }

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(createResearchSchema)) body: CreateResearchDto,
  ): Promise<Research> {
    return this.researchService.create(userId, body)
  }

  @Get()
  list(
    @CurrentUser('id') userId: string,
    @Query(new ZodValidationPipe(listResearchQuerySchema)) query: ListResearchQuery,
  ): Promise<ResearchPage> {
    return this.researchService.list(userId, query)
  }

  @Get(':researchId')
  get(
    @CurrentUser('id') userId: string,
    @Param(new ZodValidationPipe(researchIdParamSchema)) params: ResearchIdParam,
  ): Promise<Research> {
    return this.researchService.get(userId, params.researchId)
  }

  @Patch(':researchId')
  update(
    @CurrentUser('id') userId: string,
    @Param(new ZodValidationPipe(researchIdParamSchema)) params: ResearchIdParam,
    @Body(new ZodValidationPipe(updateResearchSchema)) body: UpdateResearchDto,
  ): Promise<Research> {
    return this.researchService.update(userId, params.researchId, body)
  }
}
