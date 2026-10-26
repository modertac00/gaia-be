import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'
import type { ApiErrorResponse } from '@moderta/api-contracts/gaia'
import type { Request, Response } from 'express'
import { requestPath } from '../http/request-path'

export const INTERNAL_ERROR_MESSAGE = 'Internal server error'

type ErrorBody = Pick<ApiErrorResponse, 'statusCode' | 'message' | 'errors'>

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp()
    const request = http.getRequest<Request>()
    const response = http.getResponse<Response>()
    const { statusCode, message, errors } = this.toBody(exception)

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : 'Non-error thrown')
    }
    if (response.headersSent) return

    const body: ApiErrorResponse = {
      success: false,
      statusCode,
      message,
      ...(errors && { errors }),
      timestamp: new Date().toISOString(),
      path: requestPath(request),
    }
    response.status(statusCode).json(body)
  }

  private fromForeignError(exception: unknown): ErrorBody {
    const { statusCode, status, message } = (exception ?? {}) as Record<string, unknown>
    const code = typeof statusCode === 'number' ? statusCode : status
    const isClientError = typeof code === 'number' && Number.isInteger(code) && code >= 400 && code < 500

    if (isClientError && typeof message === 'string') return { statusCode: code, message }
    return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: INTERNAL_ERROR_MESSAGE }
  }

  private toBody(exception: unknown): ErrorBody {
    if (!(exception instanceof HttpException)) return this.fromForeignError(exception)

    const statusCode = exception.getStatus()
    const payload = exception.getResponse()
    if (typeof payload === 'string') return { statusCode, message: payload }

    const { message, errors } = payload as { message?: string | string[]; errors?: Record<string, unknown> }
    return {
      statusCode,
      message: Array.isArray(message) ? message.join(', ') : (message ?? exception.message),
      ...(errors && { errors }),
    }
  }
}
