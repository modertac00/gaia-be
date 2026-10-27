import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { API_ERROR_CODE, type ApiError, type ApiErrorResponse } from '@moderta/api-contracts/gaia'
import type { Response } from 'express'
import { ApiException } from '@/common/http/api-exception'
import { ensureRequestId, type RequestWithId } from '@/common/http/request-id'

export const INTERNAL_ERROR_MESSAGE = 'Internal server error'

interface ErrorResult {
  statusCode: number
  error: ApiError
}

const CODE_BY_STATUS: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: API_ERROR_CODE.BAD_REQUEST,
  [HttpStatus.UNAUTHORIZED]: API_ERROR_CODE.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: API_ERROR_CODE.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: API_ERROR_CODE.NOT_FOUND,
  [HttpStatus.CONFLICT]: API_ERROR_CODE.CONFLICT,
  [HttpStatus.UNPROCESSABLE_ENTITY]: API_ERROR_CODE.UNPROCESSABLE_ENTITY,
  [HttpStatus.TOO_MANY_REQUESTS]: API_ERROR_CODE.RATE_LIMITED,
  [HttpStatus.SERVICE_UNAVAILABLE]: API_ERROR_CODE.SERVICE_UNAVAILABLE,
}

function codeForStatus(status: number): string {
  const known = CODE_BY_STATUS[status]
  if (known) return known
  return status >= 400 && status < 500 ? API_ERROR_CODE.BAD_REQUEST : API_ERROR_CODE.INTERNAL_ERROR
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp()
    const request = http.getRequest<RequestWithId>()
    const response = http.getResponse<Response>()
    const { statusCode, error } = this.toResult(exception)

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) this.logger.error(this.describe(exception))
    if (response.headersSent) return

    const body: ApiErrorResponse = {
      success: false,
      error,
      meta: { requestId: ensureRequestId(request, response) },
    }
    response.status(statusCode).json(body)
  }

  private describe(exception: unknown): string {
    if (!(exception instanceof Error)) return 'Non-error thrown'

    const { parent, original, status, code } = exception as Error & {
      parent?: Error
      original?: Error
      status?: unknown
      code?: unknown
    }
    const lines = [exception.stack ?? exception.message]
    const cause = parent ?? original
    if (cause) lines.push(`caused by: ${cause.name}: ${cause.message}`)
    // Supabase auth errors carry these; plain Errors do not.
    if (typeof status === 'number' || typeof code === 'string') {
      lines.push(`details: name=${exception.name} status=${String(status)} code=${String(code)}`)
    }
    return lines.join('\n')
  }

  private fromForeignError(exception: unknown): ErrorResult {
    const { statusCode, status, message } = (exception ?? {}) as Record<string, unknown>
    const code = typeof statusCode === 'number' ? statusCode : status
    const isClientError = typeof code === 'number' && Number.isInteger(code) && code >= 400 && code < 500

    if (isClientError && typeof message === 'string') {
      return { statusCode: code, error: { code: codeForStatus(code), message } }
    }
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: { code: API_ERROR_CODE.INTERNAL_ERROR, message: INTERNAL_ERROR_MESSAGE },
    }
  }

  private toResult(exception: unknown): ErrorResult {
    if (!(exception instanceof HttpException)) return this.fromForeignError(exception)

    const statusCode = exception.getStatus()
    if (exception instanceof ApiException) {
      const { code, message, details } = exception.body
      return { statusCode, error: { code: code ?? codeForStatus(statusCode), message, ...(details && { details }) } }
    }

    const payload = exception.getResponse()
    const message =
      typeof payload === 'string' ? payload : ((payload as { message?: string | string[] }).message ?? exception.message)

    return {
      statusCode,
      error: { code: codeForStatus(statusCode), message: Array.isArray(message) ? message.join(', ') : message },
    }
  }
}
