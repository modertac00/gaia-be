import { applyDecorators, HttpStatus } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { researchIdParamSchema, researchLinkSchema } from '@moderta/api-contracts/gaia'
import { ApiErrorResponses, ApiZodListResponse, ZodParam } from '@/common/swagger'

const { BAD_REQUEST, UNAUTHORIZED, NOT_FOUND } = HttpStatus

export const ApiResearchLinksController = () => applyDecorators(ApiTags('research-links'), ApiBearerAuth())

export const ApiListResearchLinks = () =>
  applyDecorators(
    ApiOperation({
      summary: 'List the links from the research to thesis sections and requirement documents',
      description: 'Oldest first. The list is empty when the research has no links.',
    }),
    ZodParam(researchIdParamSchema),
    ApiZodListResponse(researchLinkSchema, HttpStatus.OK, 'Research links'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, NOT_FOUND),
  )
