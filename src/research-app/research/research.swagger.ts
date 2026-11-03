import { applyDecorators, HttpStatus } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  createResearchSchema,
  listResearchQuerySchema,
  researchIdParamSchema,
  researchSchema,
  updateResearchSchema,
} from '@moderta/api-contracts/gaia'
import { ApiErrorResponses, ApiZodListResponse, ApiZodResponse, ZodBody, ZodParam, ZodQuery } from '@/common/swagger'

const { BAD_REQUEST, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT } = HttpStatus

export const ApiResearchController = () => applyDecorators(ApiTags('research'), ApiBearerAuth())

export const ApiCreateResearch = () =>
  applyDecorators(
    ApiOperation({ summary: 'Create a research (draft, or submitted for verification when isDraft is false)' }),
    ZodBody(createResearchSchema),
    ApiZodResponse(researchSchema, HttpStatus.CREATED, 'Created research'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, FORBIDDEN),
  )

export const ApiListResearch = () =>
  applyDecorators(
    ApiOperation({ summary: 'List research the user created or supervises (cursor paginated)' }),
    ZodQuery(listResearchQuerySchema),
    ApiZodListResponse(researchSchema, HttpStatus.OK, 'Research list; meta.nextCursor is null on the last page'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, FORBIDDEN),
  )

export const ApiGetResearch = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get a research the user created or supervises' }),
    ZodParam(researchIdParamSchema),
    ApiZodResponse(researchSchema, HttpStatus.OK, 'Research'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, FORBIDDEN, NOT_FOUND),
  )

export const ApiUpdateResearch = () =>
  applyDecorators(
    ApiOperation({ summary: 'Partially update a draft research (creator only; supervisors get 403)' }),
    ZodParam(researchIdParamSchema),
    ZodBody(updateResearchSchema),
    ApiZodResponse(researchSchema, HttpStatus.OK, 'Updated research'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT),
  )
