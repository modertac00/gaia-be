import { Injectable, type NestMiddleware } from '@nestjs/common'
import type { NextFunction, Response } from 'express'
import { ensureRequestId, type RequestWithId } from './request-id'

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: RequestWithId, response: Response, next: NextFunction): void {
    ensureRequestId(request, response)
    next()
  }
}
