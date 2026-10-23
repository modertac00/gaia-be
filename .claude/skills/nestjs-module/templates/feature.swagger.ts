import { applyDecorators } from '@nestjs/common'
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'

// All Swagger metadata for the controller lives here so the controller only shows routing, pipes and delegation.
// Add one composed decorator per handler; response schemas come from the contract Zod schemas (JSON-schema helper).

/** Class-level: tag + bearer auth. Pass `{ public: true }` for `@Public()` controllers. */
export const Api__Feature__Controller = (options: { public?: boolean } = {}) =>
  applyDecorators(ApiTags('__route__'), ...(options.public ? [] : [ApiBearerAuth()]))

export const ApiList__Feature__ = () =>
  applyDecorators(
    ApiOperation({ summary: 'List __route__ owned by the current user' }),
    ApiOkResponse({ description: 'A cursor page of __route__' }),
  )

export const ApiGet__Feature__ = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get one __feature__' }),
    ApiOkResponse({ description: 'The __feature__' }),
    ApiNotFoundResponse({ description: '__Feature__ not found or not owned by the current user' }),
  )

export const ApiCreate__Feature__ = () =>
  applyDecorators(
    ApiOperation({ summary: 'Create a __feature__' }),
    ApiCreatedResponse({ description: 'The created __feature__' }),
  )

export const ApiUpdate__Feature__ = () =>
  applyDecorators(
    ApiOperation({ summary: 'Update a __feature__' }),
    ApiOkResponse({ description: 'The updated __feature__' }),
    ApiNotFoundResponse({ description: '__Feature__ not found or not owned by the current user' }),
  )

export const ApiArchive__Feature__ = () =>
  applyDecorators(
    ApiOperation({ summary: 'Archive a __feature__' }),
    ApiNoContentResponse({ description: '__Feature__ archived' }),
    ApiNotFoundResponse({ description: '__Feature__ not found or not owned by the current user' }),
  )
