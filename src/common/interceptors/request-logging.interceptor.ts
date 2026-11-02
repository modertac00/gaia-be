import {
  type CallHandler,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common'
import type { Response } from 'express'
import { type Observable, tap } from 'rxjs'
import { ensureRequestId, type RequestWithId } from '@/common/http/request-id'
import { AppLogger } from '@/log'

const CONTEXT = 'HTTP'

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(@Inject(AppLogger) private readonly logger: AppLogger) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp()
    const request = http.getRequest<RequestWithId>()
    const response = http.getResponse<Response>()
    const startedAt = Date.now()

    const logRequest = (statusCode: number) => {
      const requestId = ensureRequestId(request, response)
      const line = `${request.method} ${request.originalUrl} ${statusCode} ${Date.now() - startedAt}ms ${requestId}`
      if (statusCode >= HttpStatus.BAD_REQUEST) this.logger.warn(line, CONTEXT)
      else this.logger.log(line, CONTEXT)
    }

    return next.handle().pipe(
      tap({
        next: () => logRequest(response.statusCode),
        error: (error: unknown) => {
          if (error instanceof HttpException && error.getStatus() < HttpStatus.INTERNAL_SERVER_ERROR) {
            logRequest(error.getStatus())
          }
        },
      }),
    )
  }
}
