import { applyDecorators, HttpStatus } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { aiRunSchema, listAiRunsQuerySchema, researchIdParamSchema } from '@moderta/api-contracts/gaia'
import { ApiErrorResponses, ApiZodListResponse, ApiZodResponse, ZodParam, ZodQuery } from '@/common/swagger'

const { BAD_REQUEST, UNAUTHORIZED, NOT_FOUND } = HttpStatus

export const ApiAiRunsController = () => applyDecorators(ApiTags('ai-runs'), ApiBearerAuth())

export const ApiListAiRuns = () =>
  applyDecorators(
    ApiOperation({ summary: 'AI runs of the research, newest first (cursor paginated)' }),
    ZodParam(researchIdParamSchema),
    ZodQuery(listAiRunsQuerySchema),
    ApiZodListResponse(aiRunSchema, HttpStatus.OK, 'AI runs; meta.nextCursor is null on the last page'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, NOT_FOUND),
  )

export const ApiGetAiRun = () =>
  applyDecorators(
    ApiOperation({ summary: 'One AI run of the research' }),
    ZodParam(researchIdParamSchema),
    ApiZodResponse(aiRunSchema, HttpStatus.OK, 'The AI run'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, NOT_FOUND),
  )
