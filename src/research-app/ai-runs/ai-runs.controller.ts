import { Controller, Get, Inject, Param, Query } from '@nestjs/common'
import { type AiRun, type ListAiRunsQuery, listAiRunsQuerySchema, uuidParamSchema } from '@moderta/api-contracts/gaia'
import { CurrentUser } from '@/common/auth'
import type { ListResult } from '@/common/http/response-results'
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe'
import { AiRunsService } from '@/research-app/ai-runs/ai-runs.service'
import { ApiAiRunsController, ApiGetAiRun, ApiListAiRuns } from './ai-runs.swagger'

@ApiAiRunsController()
@Controller('research/:researchId/runs')
export class AiRunsController {
  constructor(@Inject(AiRunsService) private readonly aiRunsService: AiRunsService) { }

  @ApiListAiRuns()
  @Get()
  list(
    @CurrentUser('id') userId: string,
    @Param('researchId', new ZodValidationPipe(uuidParamSchema)) researchId: string,
    @Query(new ZodValidationPipe(listAiRunsQuerySchema)) query: ListAiRunsQuery,
  ): Promise<ListResult<AiRun>> {
    return this.aiRunsService.list(userId, researchId, query)
  }

  @ApiGetAiRun()
  @Get(':runId')
  get(
    @CurrentUser('id') userId: string,
    @Param('researchId', new ZodValidationPipe(uuidParamSchema)) researchId: string,
    @Param('runId', new ZodValidationPipe(uuidParamSchema)) runId: string,
  ): Promise<AiRun> {
    return this.aiRunsService.get(userId, researchId, runId)
  }
}
