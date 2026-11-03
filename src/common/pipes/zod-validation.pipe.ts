import { Injectable, type PipeTransform } from '@nestjs/common'
import { API_FIELD_ERRORS_SELF_KEY, type ApiFieldErrors } from '@moderta/api-contracts/gaia'
import type { ZodType } from 'zod'
import { ValidationFailedException } from '@/common/http/api-exception'

const BODY_KEY = 'body'

const newNode = (): ApiFieldErrors => Object.create(null) as ApiFieldErrors

function addMessage(node: ApiFieldErrors, key: string, message: string): void {
  const existing = node[key]
  if (existing === undefined) node[key] = [message]
  else if (Array.isArray(existing)) existing.push(message)
  else addMessage(existing, API_FIELD_ERRORS_SELF_KEY, message)
}

function toFieldErrors(issues: readonly { path: readonly PropertyKey[]; message: string }[]): ApiFieldErrors {
  const fields = newNode()

  for (const issue of issues) {
    const path = issue.path.map(String)
    if (!path.length) path.push(BODY_KEY)

    let node = fields
    for (const key of path.slice(0, -1)) {
      const existing = node[key]
      if (existing === undefined) {
        node[key] = newNode()
      } else if (Array.isArray(existing)) {
        const child = newNode()
        child[API_FIELD_ERRORS_SELF_KEY] = existing
        node[key] = child
      }
      node = node[key] as ApiFieldErrors
    }

    addMessage(node, path[path.length - 1], issue.message)
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
