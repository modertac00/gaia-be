import { STATUS_CODES } from 'node:http'
import { applyDecorators } from '@nestjs/common'
import { ApiBody, type ApiParamOptions, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger'
import { apiErrorResponseSchema, apiListResponseSchema, apiSuccessResponseSchema } from '@moderta/api-contracts/gaia'
import type { z } from 'zod'
import { type OpenApiSchema, toOpenApiSchema } from './zod-openapi'

/** One entry per property of an object schema: [name, required, schema]. */
function objectProperties(schema: z.ZodType): [string, boolean, OpenApiSchema][] {
  const { properties = {}, required = [] } = toOpenApiSchema(schema, 'input') as {
    properties?: Record<string, OpenApiSchema>
    required?: string[]
  }
  return Object.entries(properties).map(([name, property]) => [name, required.includes(name), property])
}

export const ZodBody = (schema: z.ZodType) => ApiBody({ schema: toOpenApiSchema(schema, 'input') })

export const ZodQuery = (schema: z.ZodType) =>
  applyDecorators(...objectProperties(schema).map(([name, required, property]) => ApiQuery({ name, required, schema: property })))

export const ZodParam = (schema: z.ZodType) =>
  applyDecorators(...objectProperties(schema).map(([name, , property]) => ApiParam({ name, required: true, schema: property as Extract<ApiParamOptions, { schema?: unknown }>['schema'] })))

/** Documents a success response wrapped in the real envelope (`{ success, data, meta }`). */
export const ApiZodResponse = (schema: z.ZodType, status: number, description: string) =>
  ApiResponse({ status, description, schema: toOpenApiSchema(apiSuccessResponseSchema(schema), 'output') })

/** Same as ApiZodResponse for a list endpoint: `data` is an array of `itemSchema`, `meta` has limit/nextCursor. */
export const ApiZodListResponse = (itemSchema: z.ZodType, status: number, description: string) =>
  ApiResponse({ status, description, schema: toOpenApiSchema(apiListResponseSchema(itemSchema), 'output') })

/** Documents the shared error envelope (`ApiErrorResponse`) for each status code. */
export const ApiErrorResponses = (...statusCodes: number[]) =>
  applyDecorators(
    ...statusCodes.map((status) =>
      ApiResponse({
        status,
        description: STATUS_CODES[status] ?? 'Error',
        schema: toOpenApiSchema(apiErrorResponseSchema, 'output'),
      }),
    ),
  )
