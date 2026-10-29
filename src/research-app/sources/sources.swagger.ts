import { applyDecorators, HttpStatus } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  askSourceQuestionSchema,
  classificationHistoryEntrySchema,
  classifySourceSchema,
  excludeSourceSchema,
  listSourceQuestionsQuerySchema,
  listSourcesQuerySchema,
  researchIdParamSchema,
  sourceIdParamSchema,
  sourceQuestionAcceptedSchema,
  sourceQuestionSchema,
  sourceSchema,
} from '@moderta/api-contracts/gaia'
import { z } from 'zod'
import { ApiErrorResponses, ApiZodListResponse, ApiZodResponse, ZodBody, ZodParam, ZodQuery } from '@/common/swagger'

const { BAD_REQUEST, UNAUTHORIZED, NOT_FOUND, CONFLICT, UNPROCESSABLE_ENTITY, SERVICE_UNAVAILABLE } = HttpStatus

export const ApiSourcesController = () => applyDecorators(ApiTags('sources'), ApiBearerAuth())

export const ApiListSources = () =>
  applyDecorators(
    ApiOperation({ summary: 'List the sources of a research the user created or supervises, ordered by citation number' }),
    ZodParam(researchIdParamSchema),
    ZodQuery(listSourcesQuerySchema),
    ApiZodResponse(z.array(sourceSchema), HttpStatus.OK, 'Sources'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, NOT_FOUND),
  )

export const ApiGetSource = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get one source' }),
    ZodParam(sourceIdParamSchema),
    ApiZodResponse(sourceSchema, HttpStatus.OK, 'Source'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, NOT_FOUND),
  )

export const ApiClassifySource = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Classify a source as supporting, contradicting or mentioning',
      description:
        'Changing an existing classification needs a reason and withdraws the source verification. Repeating the current classification changes nothing.',
    }),
    ZodParam(sourceIdParamSchema),
    ZodBody(classifySourceSchema),
    ApiZodResponse(sourceSchema, HttpStatus.OK, 'Classified source'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, NOT_FOUND, CONFLICT),
  )

export const ApiVerifySource = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Verify a source',
      description: 'The source must be classified and resolved. Repeating the request changes nothing.',
    }),
    ZodParam(sourceIdParamSchema),
    ApiZodResponse(sourceSchema, HttpStatus.OK, 'Verified source'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, NOT_FOUND, CONFLICT, UNPROCESSABLE_ENTITY),
  )

export const ApiExcludeSource = () =>
  applyDecorators(
    ApiOperation({ summary: 'Exclude a source from the research' }),
    ZodParam(sourceIdParamSchema),
    ZodBody(excludeSourceSchema),
    ApiZodResponse(sourceSchema, HttpStatus.OK, 'Excluded source'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, NOT_FOUND, CONFLICT),
  )

export const ApiSourceClassificationHistory = () =>
  applyDecorators(
    ApiOperation({ summary: 'Classification changes of a source, newest first' }),
    ZodParam(sourceIdParamSchema),
    ApiZodResponse(z.array(classificationHistoryEntrySchema), HttpStatus.OK, 'Classification history'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, NOT_FOUND),
  )

export const ApiAskSourceQuestion = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Ask a question about one source, answered only from that source',
      description:
        'The question is saved first. The answer states how much of the source it could read (contentLevel): with metadata only it declines and suggests uploading the PDF.',
    }),
    ZodParam(sourceIdParamSchema),
    ZodBody(askSourceQuestionSchema),
    ApiZodResponse(sourceQuestionAcceptedSchema, HttpStatus.ACCEPTED, 'Question accepted; read the answer from the questions list'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, NOT_FOUND, SERVICE_UNAVAILABLE),
  )

export const ApiListSourceQuestions = () =>
  applyDecorators(
    ApiOperation({ summary: 'Questions asked about one source with their answers, newest first (cursor paginated)' }),
    ZodParam(sourceIdParamSchema),
    ZodQuery(listSourceQuestionsQuerySchema),
    ApiZodListResponse(sourceQuestionSchema, HttpStatus.OK, 'Questions; meta.nextCursor is null on the last page'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, NOT_FOUND),
  )
