import { applyDecorators, HttpStatus } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { relatedPapersSchema, researchIdParamSchema } from '@moderta/api-contracts/gaia'
import { ApiErrorResponses, ApiZodResponse, ZodParam } from '@/common/swagger'

const { BAD_REQUEST, UNAUTHORIZED, NOT_FOUND } = HttpStatus

export const ApiRelatedController = () => applyDecorators(ApiTags('related'), ApiBearerAuth())

export const ApiGetRelatedPapers = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Get the related papers of the research',
      description:
        'Source-to-source links, the reading list and the number of included sources per publication year. The AI creates the links and the reading list when the research is created; the lists are empty until then.',
    }),
    ZodParam(researchIdParamSchema),
    ApiZodResponse(relatedPapersSchema, HttpStatus.OK, 'Related papers'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, NOT_FOUND),
  )
