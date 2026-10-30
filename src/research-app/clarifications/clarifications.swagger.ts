import { applyDecorators, HttpStatus } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { clarificationDraftSchema, clarificationIdParamSchema, requestClarificationSchema } from '@moderta/api-contracts/gaia'
import { ApiErrorResponses, ApiZodResponse, ZodBody, ZodParam } from '@/common/swagger'

const { BAD_REQUEST, UNAUTHORIZED, NOT_FOUND, SERVICE_UNAVAILABLE } = HttpStatus

export const ApiClarificationsController = () => applyDecorators(ApiTags('clarifications'), ApiBearerAuth())

export const ApiRequestClarification = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Ask the AI for clarifying questions before a research exists',
      description: 'Returns a pending clarification. Poll GET /research/clarifications/:clarificationId until it is ready or failed.',
    }),
    ZodBody(requestClarificationSchema),
    ApiZodResponse(clarificationDraftSchema, HttpStatus.ACCEPTED, 'Pending clarification'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, SERVICE_UNAVAILABLE),
  )

export const ApiGetClarification = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get the status and result of a clarification the user requested' }),
    ZodParam(clarificationIdParamSchema),
    ApiZodResponse(clarificationDraftSchema, HttpStatus.OK, 'Clarification; questions are null until it is ready'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, NOT_FOUND),
  )
