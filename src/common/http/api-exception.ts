import { HttpException, HttpStatus } from '@nestjs/common'
import { API_ERROR_CODE, type ApiError, type ApiValidationDetails } from '@moderta/api-contracts/gaia'

export const VALIDATION_FAILED_MESSAGE = 'Validation failed'

export type ApiExceptionBody = Pick<ApiError, 'message' | 'details'> & { code?: string }

export class ApiException extends HttpException {
  constructor(
    status: HttpStatus,
    readonly body: ApiExceptionBody,
  ) {
    super(body.message, status)
  }
}

export class ValidationFailedException extends ApiException {
  constructor(fields: ApiValidationDetails['fields']) {
    super(HttpStatus.BAD_REQUEST, {
      code: API_ERROR_CODE.VALIDATION_FAILED,
      message: VALIDATION_FAILED_MESSAGE,
      details: { fields } satisfies ApiValidationDetails,
    })
  }
}
