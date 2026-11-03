import {
  type CallHandler,
  type ExecutionContext,
  HttpStatus,
  Injectable,
  type NestInterceptor,
  StreamableFile,
} from '@nestjs/common'
import type { ApiSuccessResponse } from '@moderta/api-contracts/gaia'
import type { Response } from 'express'
import { map, type Observable } from 'rxjs'
import { ensureRequestId, type RequestWithId } from '@/common/http/request-id'
import { ListResult, WithMeta } from '@/common/http/response-results'

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp()
    const request = http.getRequest<RequestWithId>()
    const response = http.getResponse<Response>()

    return next.handle().pipe(
      map((result: unknown) => {
        const isRaw = result instanceof StreamableFile || Buffer.isBuffer(result)
        if (response.statusCode === HttpStatus.NO_CONTENT || result === undefined || isRaw || response.headersSent) {
          return result
        }

        const requestId = ensureRequestId(request, response)

        if (result instanceof ListResult) {
          return {
            success: true,
            data: result.items,
            meta: { requestId, limit: result.limit, nextCursor: result.nextCursor },
          } satisfies ApiSuccessResponse<unknown[], Record<string, unknown>>
        }
        if (result instanceof WithMeta) {
          return {
            success: true,
            data: result.data,
            meta: { ...result.meta, requestId },
          } satisfies ApiSuccessResponse<unknown, Record<string, unknown>>
        }

        return { success: true, data: result, meta: { requestId } } satisfies ApiSuccessResponse<unknown>
      }),
    )
  }
}
