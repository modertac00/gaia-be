import { Injectable, type PipeTransform } from '@nestjs/common'
import type { ApiValidationDetails } from '@moderta/api-contracts/gaia'
import type { ZodType } from 'zod'
import { ValidationFailedException } from '@/common/http/api-exception'

type FieldErrors = ApiValidationDetails['fields']

function toFieldErrors(issues: readonly { path: readonly PropertyKey[]; message: string }[]): FieldErrors {
  const fields: FieldErrors = {}
  for (const issue of issues) {
    const key = issue.path.length ? issue.path.map(String).join('.') : 'body'
      ; (fields[key] ??= []).push(issue.message)
  }
  return fields
}

@Injectable()
export class ZodValidationPipe<TOutput = unknown> implements PipeTransform<unknown, TOutput> {
  constructor(private readonly schema: ZodType<TOutput>) { }

  transform(value: unknown): TOutput {
    const result = this.schema.safeParse(value)

    if (!result.success) {
      throw new ValidationFailedException(toFieldErrors(result.error.issues))
    }

    return result.data
  }
}
