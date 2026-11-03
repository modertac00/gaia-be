import { applyDecorators, HttpStatus } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { createExportSchema, exportBlockedSchema, exportSchema, researchIdParamSchema } from '@moderta/api-contracts/gaia'
import { ApiErrorResponses, ApiZodResponse, ZodBody, ZodParam } from '@/common/swagger'

const { BAD_REQUEST, UNAUTHORIZED, NOT_FOUND, CONFLICT } = HttpStatus

export const ApiExportsController = () => applyDecorators(ApiTags('exports'), ApiBearerAuth())

export const ApiCreateExport = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Export the research',
      description:
        'Files are not generated yet: the response carries the export content. The package format contains everything, whatever the scope. Parts the export does not contain are null. Blocked with 409 while an included source is unverified.',
    }),
    ZodParam(researchIdParamSchema),
    ZodBody(createExportSchema),
    ApiZodResponse(exportSchema, HttpStatus.CREATED, 'Export'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, NOT_FOUND),
    ApiZodResponse(exportBlockedSchema, CONFLICT, 'An included source is unverified'),
  )
