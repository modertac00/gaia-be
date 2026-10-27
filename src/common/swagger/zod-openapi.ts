import type { ApiBodyOptions } from '@nestjs/swagger'
import { z } from 'zod'

export type OpenApiSchema = Extract<ApiBodyOptions, { schema: unknown }>['schema']

/**
 * Converts a Zod contract into an OpenAPI 3.0 schema (the version @nestjs/swagger emits).
 * `input` describes what a client sends (defaults optional); `output` what it receives.
 * Reused sub-schemas are inlined, so the result never contains `$ref`/`$defs`.
 */
export function toOpenApiSchema(schema: z.ZodType, io: 'input' | 'output'): OpenApiSchema {
  const jsonSchema: Record<string, unknown> = z.toJSONSchema(schema, {
    target: 'openapi-3.0',
    io,
    reused: 'inline',
    unrepresentable: 'any',
  })
  delete jsonSchema.$schema

  return jsonSchema as OpenApiSchema
}
