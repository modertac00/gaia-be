import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common'
import type { ZodType } from 'zod'

export interface ValidationErrors {
  [field: string]: string[] | ValidationErrors
}

export const VALIDATION_FAILED_MESSAGE = 'Validation failed'

const isMessages = (node: string[] | ValidationErrors): node is string[] => Array.isArray(node)

function toValidationErrors(issues: readonly { path: readonly PropertyKey[]; message: string }[]): ValidationErrors {
  const errors: ValidationErrors = {}
  for (const issue of issues) {
    const path = issue.path.length ? issue.path.map(String) : ['body']
    let node = errors
    for (const key of path.slice(0, -1)) {
      const next = node[key]
      if (next === undefined || isMessages(next)) node[key] = {}
      node = node[key] as ValidationErrors
    }
    const leaf = path.at(-1) as string
    const existing = node[leaf]
    if (existing === undefined) node[leaf] = [issue.message]
    else if (isMessages(existing)) existing.push(issue.message)
  }
  return errors
}

@Injectable()
export class ZodValidationPipe<TOutput = unknown> implements PipeTransform<unknown, TOutput> {
  constructor(private readonly schema: ZodType<TOutput>) { }

  transform(value: unknown): TOutput {
    const result = this.schema.safeParse(value)

    if (!result.success) {
      throw new BadRequestException({
        message: VALIDATION_FAILED_MESSAGE,
        errors: toValidationErrors(result.error.issues),
      })
    }

    return result.data
  }
}
