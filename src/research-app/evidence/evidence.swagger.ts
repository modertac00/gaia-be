import { applyDecorators, HttpStatus } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  evidenceIdParamSchema,
  evidenceMatrixSchema,
  evidenceRowSchema,
  researchIdParamSchema,
} from '@moderta/api-contracts/gaia'
import { ApiErrorResponses, ApiZodResponse, ZodParam } from '@/common/swagger'

const { BAD_REQUEST, UNAUTHORIZED, NOT_FOUND, CONFLICT } = HttpStatus

export const ApiEvidenceController = () => applyDecorators(ApiTags('evidence'), ApiBearerAuth())

export const ApiGetEvidence = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Get the evidence matrix of the research',
      description: 'Rejected rows are left out. The AI extracts evidence when the research is created; a failed extraction shows as one failed row.',
    }),
    ZodParam(researchIdParamSchema),
    ApiZodResponse(evidenceMatrixSchema, HttpStatus.OK, 'Evidence matrix'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, NOT_FOUND),
  )

export const ApiAcceptEvidence = () =>
  applyDecorators(
    ApiOperation({ summary: 'Accept a ready, pending evidence row' }),
    ZodParam(evidenceIdParamSchema),
    ApiZodResponse(evidenceRowSchema, HttpStatus.OK, 'Accepted row'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, NOT_FOUND, CONFLICT),
  )

export const ApiRejectEvidence = () =>
  applyDecorators(
    ApiOperation({ summary: 'Reject a ready, pending evidence row' }),
    ZodParam(evidenceIdParamSchema),
    ApiZodResponse(evidenceRowSchema, HttpStatus.OK, 'Rejected row'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, NOT_FOUND, CONFLICT),
  )
