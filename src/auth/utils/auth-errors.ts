import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
  UnprocessableEntityException,
  UnauthorizedException,
} from '@nestjs/common'
import { AUTH_RESPONSE_MESSAGES } from '@moderta/api-contracts/gaia'
import type { AuthProviderError } from '../interfaces/auth-provider.interface'

export function toHttpException({ kind }: AuthProviderError): HttpException {
  switch (kind) {
    case 'invalid_credentials':
      return new UnauthorizedException(AUTH_RESPONSE_MESSAGES.INVALID_CREDENTIALS)
    case 'invalid_token':
      return new UnauthorizedException(AUTH_RESPONSE_MESSAGES.INVALID_REFRESH_TOKEN)
    case 'email_taken':
      return new ConflictException(AUTH_RESPONSE_MESSAGES.ACCOUNT_NOT_CREATED)
    case 'weak_password':
      return new BadRequestException(AUTH_RESPONSE_MESSAGES.WEAK_PASSWORD)
    case 'same_password':
      return new UnprocessableEntityException(AUTH_RESPONSE_MESSAGES.SAME_PASSWORD)
    case 'bad_request':
      return new BadRequestException(AUTH_RESPONSE_MESSAGES.BAD_REQUEST)
    case 'rate_limited':
      return new HttpException(AUTH_RESPONSE_MESSAGES.RATE_LIMITED, HttpStatus.TOO_MANY_REQUESTS)
    case 'unavailable':
      return new ServiceUnavailableException(AUTH_RESPONSE_MESSAGES.UNAVAILABLE)
  }
}
