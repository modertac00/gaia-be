import { Body, Controller, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common'
import {
  type CreateResearchDto,
  createResearchSchema,
  type ListResearchQuery,
  listResearchQuerySchema,
  type Research,
  type ResearchIdParam,
  researchIdParamSchema,
  type UpdateResearchDto,
  updateResearchSchema,
} from '@moderta/api-contracts/gaia'
import { CurrentUser } from '@/common/auth'
import type { ListResult } from '@/common/http/response-results'
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe'
import { ResearchService } from '@/research/services/research.service'
import { ApiCreateResearch, ApiGetResearch, ApiListResearch, ApiResearchController, ApiUpdateResearch } from './research.swagger'

@ApiResearchController()
@Controller('research')
export class ResearchController {
  constructor(@Inject(ResearchService) private readonly researchService: ResearchService) { }

  @ApiCreateResearch()
  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(createResearchSchema)) body: CreateResearchDto,
  ): Promise<Research> {
    return this.researchService.create(userId, body)
  }

  @ApiListResearch()
  @Get()
  list(
    @CurrentUser('id') userId: string,
    @Query(new ZodValidationPipe(listResearchQuerySchema)) query: ListResearchQuery,
  ): Promise<ListResult<Research>> {
    return this.researchService.list(userId, query)
  }

  @ApiGetResearch()
  @Get(':researchId')
  get(
    @CurrentUser('id') userId: string,
    @Param(new ZodValidationPipe(researchIdParamSchema)) params: ResearchIdParam,
  ): Promise<Research> {
    return this.researchService.get(userId, params.researchId)
  }

  @ApiUpdateResearch()
  @Patch(':researchId')
  update(
    @CurrentUser('id') userId: string,
    @Param(new ZodValidationPipe(researchIdParamSchema)) params: ResearchIdParam,
    @Body(new ZodValidationPipe(updateResearchSchema)) body: UpdateResearchDto,
  ): Promise<Research> {
    return this.researchService.update(userId, params.researchId, body)
  }
}
