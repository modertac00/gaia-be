// Adapted from esm-api/src/common/zod.pipe.ts (org standard). Zod 4.
import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common'
import type { ZodType } from 'zod'

export interface ValidationErrorItem {
  field: string
  message: string
  code: string
}

@Injectable()
export class ZodValidationPipe<TOutput = unknown> implements PipeTransform<unknown, TOutput> {
  constructor(private readonly schema: ZodType<TOutput>) {}

  transform(value: unknown): TOutput {
    const result = this.schema.safeParse(value)

    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: result.error.issues.map(
          (issue): ValidationErrorItem => ({
            field: issue.path.length ? issue.path.join('.') : 'body',
            message: issue.message,
            code: issue.code,
          }),
        ),
      })
    }

    return result.data
  }
}

// Usage:
// @Body(new ZodValidationPipe(createResearchSchema)) body: CreateResearchDto
