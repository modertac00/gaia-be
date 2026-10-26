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
import { AUTH_PROVIDER_ERROR_KIND } from '@/auth/constants/auth.constants'
import type { AuthProviderError } from '../interfaces/auth-provider.interface'

export function toHttpException({ kind }: AuthProviderError): HttpException {
  switch (kind) {
    case AUTH_PROVIDER_ERROR_KIND.INVALID_CREDENTIALS:
      return new UnauthorizedException(AUTH_RESPONSE_MESSAGES.INVALID_CREDENTIALS)
    case AUTH_PROVIDER_ERROR_KIND.INVALID_TOKEN:
      return new UnauthorizedException(AUTH_RESPONSE_MESSAGES.INVALID_REFRESH_TOKEN)
    case AUTH_PROVIDER_ERROR_KIND.EMAIL_TAKEN:
      return new ConflictException(AUTH_RESPONSE_MESSAGES.ACCOUNT_NOT_CREATED)
    case AUTH_PROVIDER_ERROR_KIND.WEAK_PASSWORD:
      return new BadRequestException(AUTH_RESPONSE_MESSAGES.WEAK_PASSWORD)
    case AUTH_PROVIDER_ERROR_KIND.SAME_PASSWORD:
      return new UnprocessableEntityException(AUTH_RESPONSE_MESSAGES.SAME_PASSWORD)
    case AUTH_PROVIDER_ERROR_KIND.BAD_REQUEST:
      return new BadRequestException(AUTH_RESPONSE_MESSAGES.BAD_REQUEST)
    case AUTH_PROVIDER_ERROR_KIND.RATE_LIMITED:
      return new HttpException(AUTH_RESPONSE_MESSAGES.RATE_LIMITED, HttpStatus.TOO_MANY_REQUESTS)
    case AUTH_PROVIDER_ERROR_KIND.UNAVAILABLE:
      return new ServiceUnavailableException(AUTH_RESPONSE_MESSAGES.UNAVAILABLE)
  }
}
