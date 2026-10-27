import type { Request } from 'express'

export function requestPath(request: Request): string {
  return request.originalUrl.split('?')[0]
}
