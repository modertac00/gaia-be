import { STATUS_CODES } from 'node:http'
import {
  type CallHandler,
  type ExecutionContext,
  HttpStatus,
  Inject,
  Injectable,
  type NestInterceptor,
  StreamableFile,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { ApiSuccessResponse } from '@moderta/api-contracts/gaia'
import type { Request, Response } from 'express'
import { map, type Observable } from 'rxjs'
import { RESPONSE_MESSAGE_KEY } from '@/common/decorators/response-message.decorator'
import { requestPath } from '@/common/http/request-path'

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiSuccessResponse<T> | T> {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) { }

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccessResponse<T> | T> {
    const http = context.switchToHttp()
    const request = http.getRequest<Request>()
    const response = http.getResponse<Response>()

    return next.handle().pipe(
      map((data) => {
        const statusCode = response.statusCode
        const isRaw = data instanceof StreamableFile || Buffer.isBuffer(data)
        if (statusCode === HttpStatus.NO_CONTENT || data === undefined || isRaw || response.headersSent) return data

        const message =
          this.reflector.getAllAndOverride<string | undefined>(RESPONSE_MESSAGE_KEY, [
            context.getHandler(),
            context.getClass(),
          ]) ??
          STATUS_CODES[statusCode] ??
          'OK'

        return {
          success: true as const,
          statusCode,
          message,
          data,
          timestamp: new Date().toISOString(),
          path: requestPath(request),
        }
      }),
    )
  }
}
