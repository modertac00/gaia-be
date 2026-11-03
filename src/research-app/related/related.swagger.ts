import { applyDecorators, HttpStatus } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  addReadingListPaperParamSchema,
  addReadingListPaperSchema,
  readingListPaperAcceptedSchema,
  relatedPapersSchema,
  researchIdParamSchema,
} from '@moderta/api-contracts/gaia'
import { ApiErrorResponses, ApiZodResponse, ZodBody, ZodParam } from '@/common/swagger'

const { BAD_REQUEST, UNAUTHORIZED, NOT_FOUND, CONFLICT, SERVICE_UNAVAILABLE } = HttpStatus

export const ApiRelatedController = () => applyDecorators(ApiTags('related'), ApiBearerAuth())

export const ApiGetRelatedPapers = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Get the related papers of the research',
      description:
        'Links between sources of the research, the reading list (papers that are not sources yet, with their details) and the number of included sources per publication year. The AI sends the links and the reading list after the draft and after every added paper; the lists are empty until then.',
    }),
    ZodParam(researchIdParamSchema),
    ApiZodResponse(relatedPapersSchema, HttpStatus.OK, 'Related papers'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, NOT_FOUND),
  )

export const ApiAddReadingListPaper = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Add a reading-list paper to the research',
      description:
        'The paper becomes a source of the research and leaves the reading list. The AI then reads, summarises and classifies it; the new links and reading list arrive afterwards.',
    }),
    ZodParam(addReadingListPaperParamSchema),
    ZodBody(addReadingListPaperSchema),
    ApiZodResponse(readingListPaperAcceptedSchema, HttpStatus.ACCEPTED, 'Paper added; the AI run was queued'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, NOT_FOUND, CONFLICT, SERVICE_UNAVAILABLE),
  )
