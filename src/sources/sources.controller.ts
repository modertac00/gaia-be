import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, Patch, Post, Query } from '@nestjs/common'
import {
  type AskSourceQuestionDto,
  askSourceQuestionSchema,
  type ClassificationHistoryEntry,
  type ClassifySourceDto,
  classifySourceSchema,
  type ExcludeSourceDto,
  excludeSourceSchema,
  type ListSourceQuestionsQuery,
  listSourceQuestionsQuerySchema,
  type ListSourcesQuery,
  listSourcesQuerySchema,
  type ResearchIdParam,
  researchIdParamSchema,
  type Source,
  type SourceIdParam,
  sourceIdParamSchema,
  type SourceQuestion,
  type SourceQuestionAccepted,
} from '@moderta/api-contracts/gaia'
import { CurrentUser } from '@/common/auth'
import type { ListResult } from '@/common/http/response-results'
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe'
import { SourcesService } from '@/sources/services/sources.service'
import {
  ApiAskSourceQuestion,
  ApiClassifySource,
  ApiExcludeSource,
  ApiGetSource,
  ApiListSourceQuestions,
  ApiListSources,
  ApiSourceClassificationHistory,
  ApiSourcesController,
  ApiVerifySource,
} from './sources.swagger'

@ApiSourcesController()
@Controller('research/:researchId/sources')
export class SourcesController {
  constructor(@Inject(SourcesService) private readonly sourcesService: SourcesService) { }

  @ApiListSources()
  @Get()
  list(
    @CurrentUser('id') userId: string,
    @Param(new ZodValidationPipe(researchIdParamSchema)) params: ResearchIdParam,
    @Query(new ZodValidationPipe(listSourcesQuerySchema)) query: ListSourcesQuery,
  ): Promise<Source[]> {
    return this.sourcesService.list(userId, params.researchId, query)
  }

  @ApiGetSource()
  @Get(':sourceId')
  get(
    @CurrentUser('id') userId: string,
    @Param(new ZodValidationPipe(sourceIdParamSchema)) params: SourceIdParam,
  ): Promise<Source> {
    return this.sourcesService.get(userId, params.researchId, params.sourceId)
  }

  @ApiClassifySource()
  @Patch(':sourceId/classification')
  classify(
    @CurrentUser('id') userId: string,
    @Param(new ZodValidationPipe(sourceIdParamSchema)) params: SourceIdParam,
    @Body(new ZodValidationPipe(classifySourceSchema)) body: ClassifySourceDto,
  ): Promise<Source> {
    return this.sourcesService.classify(userId, params.researchId, params.sourceId, body)
  }

  @ApiVerifySource()
  @Post(':sourceId/verification')
  @HttpCode(HttpStatus.OK)
  verify(
    @CurrentUser('id') userId: string,
    @Param(new ZodValidationPipe(sourceIdParamSchema)) params: SourceIdParam,
  ): Promise<Source> {
    return this.sourcesService.verify(userId, params.researchId, params.sourceId)
  }

  @ApiExcludeSource()
  @Post(':sourceId/exclusion')
  @HttpCode(HttpStatus.OK)
  exclude(
    @CurrentUser('id') userId: string,
    @Param(new ZodValidationPipe(sourceIdParamSchema)) params: SourceIdParam,
    @Body(new ZodValidationPipe(excludeSourceSchema)) body: ExcludeSourceDto,
  ): Promise<Source> {
    return this.sourcesService.exclude(userId, params.researchId, params.sourceId, body)
  }

  @ApiSourceClassificationHistory()
  @Get(':sourceId/classification-history')
  classificationHistory(
    @CurrentUser('id') userId: string,
    @Param(new ZodValidationPipe(sourceIdParamSchema)) params: SourceIdParam,
  ): Promise<ClassificationHistoryEntry[]> {
    return this.sourcesService.classificationHistory(userId, params.researchId, params.sourceId)
  }

  @ApiAskSourceQuestion()
  @Post(':sourceId/questions')
  @HttpCode(HttpStatus.ACCEPTED)
  ask(
    @CurrentUser('id') userId: string,
    @Param(new ZodValidationPipe(sourceIdParamSchema)) params: SourceIdParam,
    @Body(new ZodValidationPipe(askSourceQuestionSchema)) body: AskSourceQuestionDto,
  ): Promise<SourceQuestionAccepted> {
    return this.sourcesService.ask(userId, params.researchId, params.sourceId, body)
  }

  @ApiListSourceQuestions()
  @Get(':sourceId/questions')
  questions(
    @CurrentUser('id') userId: string,
    @Param(new ZodValidationPipe(sourceIdParamSchema)) params: SourceIdParam,
    @Query(new ZodValidationPipe(listSourceQuestionsQuerySchema)) query: ListSourceQuestionsQuery,
  ): Promise<ListResult<SourceQuestion>> {
    return this.sourcesService.questions(userId, params.researchId, params.sourceId, query)
  }
}
