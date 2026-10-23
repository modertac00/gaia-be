import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'
import type { Response } from 'express'
import { InvalidCursorError } from '../database/cursor-pagination'

interface ErrorBody {
  statusCode: number
  message: string
  errors?: Record<string, unknown>
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>()
    const body = this.toBody(exception)
    if (body.statusCode >= 500) this.logger.error(exception) // never log request bodies or tokens
    response.status(body.statusCode).json(body)
  }

  private toBody(exception: unknown): ErrorBody {
    if (exception instanceof InvalidCursorError) {
      return { statusCode: HttpStatus.BAD_REQUEST, message: exception.message }
    }
    if (!(exception instanceof HttpException)) {
      return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' }
    }
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
