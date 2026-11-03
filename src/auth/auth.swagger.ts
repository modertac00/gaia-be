import { applyDecorators, HttpStatus } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  authSessionSchema,
  authUserSchema,
  forgotPasswordSchema,
  loginSchema,
  messageResponseSchema,
  refreshTokenSchema,
  resetPasswordSchema,
  signupSchema,
} from '@moderta/api-contracts/gaia'
import { ApiErrorResponses, ApiZodResponse, ZodBody } from '@/common/swagger'

const { BAD_REQUEST, UNAUTHORIZED, FORBIDDEN, CONFLICT, UNPROCESSABLE_ENTITY, TOO_MANY_REQUESTS, SERVICE_UNAVAILABLE } =
  HttpStatus

export const ApiAuthController = () => ApiTags('auth')

export const ApiSignup = () =>
  applyDecorators(
    ApiOperation({ summary: 'Create a Gaia account and sign in' }),
    ZodBody(signupSchema),
    ApiZodResponse(authSessionSchema, HttpStatus.CREATED, 'Account created; session returned'),
    ApiErrorResponses(BAD_REQUEST, CONFLICT, TOO_MANY_REQUESTS, SERVICE_UNAVAILABLE),
  )

export const ApiLogin = () =>
  applyDecorators(
    ApiOperation({ summary: 'Sign in with email and password' }),
    ZodBody(loginSchema),
    ApiZodResponse(authSessionSchema, HttpStatus.OK, 'Session'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, FORBIDDEN, TOO_MANY_REQUESTS, SERVICE_UNAVAILABLE),
  )

export const ApiRefresh = () =>
  applyDecorators(
    ApiOperation({ summary: 'Exchange a refresh token for a new session' }),
    ZodBody(refreshTokenSchema),
    ApiZodResponse(authSessionSchema, HttpStatus.OK, 'Session'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, FORBIDDEN, TOO_MANY_REQUESTS, SERVICE_UNAVAILABLE),
  )

export const ApiLogout = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Revoke the current session' }),
    ApiZodResponse(messageResponseSchema, HttpStatus.OK, 'Logged out'),
    ApiErrorResponses(UNAUTHORIZED, FORBIDDEN, TOO_MANY_REQUESTS, SERVICE_UNAVAILABLE),
  )

export const ApiMe = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get the authenticated user' }),
    ApiZodResponse(authUserSchema, HttpStatus.OK, 'Authenticated user'),
    ApiErrorResponses(UNAUTHORIZED, FORBIDDEN, SERVICE_UNAVAILABLE),
  )

export const ApiForgotPassword = () =>
  applyDecorators(
    ApiOperation({ summary: 'Request a password reset email (same response whether or not the email exists)' }),
    ZodBody(forgotPasswordSchema),
    ApiZodResponse(messageResponseSchema, HttpStatus.OK, 'Generic confirmation'),
    ApiErrorResponses(BAD_REQUEST),
  )

export const ApiResetPassword = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Set a new password; the Bearer token must be a password-recovery session' }),
    ZodBody(resetPasswordSchema),
    ApiZodResponse(messageResponseSchema, HttpStatus.OK, 'Password updated; all sessions revoked'),
    ApiErrorResponses(BAD_REQUEST, UNAUTHORIZED, FORBIDDEN, UNPROCESSABLE_ENTITY, TOO_MANY_REQUESTS, SERVICE_UNAVAILABLE),
  )
