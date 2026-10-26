import type { SignOutScope } from '@supabase/supabase-js'

export const AUTH_PROVIDER_ERROR_KIND = {
  INVALID_CREDENTIALS: 'invalid_credentials',
  INVALID_TOKEN: 'invalid_token',
  EMAIL_TAKEN: 'email_taken',
  WEAK_PASSWORD: 'weak_password',
  SAME_PASSWORD: 'same_password',
  BAD_REQUEST: 'bad_request',
  RATE_LIMITED: 'rate_limited',
  UNAVAILABLE: 'unavailable',
} as const

export const SUPABASE_AUTH_ERROR_CODE = {
  EMAIL_EXISTS: 'email_exists',
  USER_ALREADY_EXISTS: 'user_already_exists',
  WEAK_PASSWORD: 'weak_password',
  SAME_PASSWORD: 'same_password',
} as const

export const SUPABASE_EMAIL_TAKEN_CODES: readonly string[] = [
  SUPABASE_AUTH_ERROR_CODE.EMAIL_EXISTS,
  SUPABASE_AUTH_ERROR_CODE.USER_ALREADY_EXISTS,
]

export const AUTH_SIGN_OUT_SCOPE = {
  LOCAL: 'local',
  GLOBAL: 'global',
} as const satisfies Record<string, SignOutScope>

export const RECOVERY_AUTH_METHOD = 'recovery'

export const SUPABASE_USER_METADATA_KEY = {
  NAME: 'name',
  FULL_NAME: 'full_name',
} as const
