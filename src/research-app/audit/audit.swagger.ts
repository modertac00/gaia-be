import { applyDecorators, HttpStatus } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  activityEventSchema,
  auditChecksSchema,
  listActivityQuerySchema,
  researchIdParamSchema,
} from '@moderta/api-contracts/gaia'
import { ApiErrorResponses, ApiZodListResponse, ApiZodResponse, ZodParam, ZodQuery } from '@/common/swagger'

const { BAD_REQUEST, UNAUTHORIZED, NOT_FOUND } = HttpStatus

export const ApiAuditController = () => applyDecorators(ApiTags('audit'), ApiBearerAuth())

export const ApiGetAuditChecks = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Get the four audit checks of the research',
      description:
        'Always four checks, in order: unsupported claims, citation mismatches, inconsistent figures, problematic sources. Unsupported claims and problematic sources are computed from the latest note and the included sources; the other two come from the AI audit.',
    }),
    ZodParam(researchIdParamSchema),
    ApiZodResponse(auditChecksSchema, HttpStatus.OK, 'Audit checks'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, NOT_FOUND),
  )

export const ApiListActivity = () =>
  applyDecorators(
    ApiOperation({ summary: 'Activity events of the research, newest first (cursor paginated)' }),
    ZodParam(researchIdParamSchema),
    ZodQuery(listActivityQuerySchema),
    ApiZodListResponse(activityEventSchema, HttpStatus.OK, 'Activity events; meta.nextCursor is null on the last page'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, NOT_FOUND),
  )
