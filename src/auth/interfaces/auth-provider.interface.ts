import type { AuthIdentity } from '@moderta/api-contracts/gaia'
import type { SignOutScope } from '@supabase/supabase-js'
import type { AUTH_PROVIDER_ERROR_KIND } from '@/auth/constants/auth.constants'

export const AUTH_PROVIDER = Symbol('AUTH_PROVIDER')

export interface ProviderSession {
  accessToken: string
  refreshToken: string
  expiresAt?: number
  identity: AuthIdentity
}

export interface CreateAccountInput {
  email: string
  password: string
  name: string
}

export type AuthProviderErrorKind = (typeof AUTH_PROVIDER_ERROR_KIND)[keyof typeof AUTH_PROVIDER_ERROR_KIND]

export class AuthProviderError extends Error {
  constructor(readonly kind: AuthProviderErrorKind) {
    super(kind)
  }
}

export interface AuthProvider {
  signInWithPassword(email: string, password: string): Promise<ProviderSession>
  createAccount(input: CreateAccountInput): Promise<AuthIdentity>
  refreshSession(refreshToken: string): Promise<ProviderSession>
  signOut(accessToken: string, scope?: SignOutScope): Promise<void>
  sendPasswordReset(email: string, redirectTo: string): Promise<void>
  updatePassword(userId: string, password: string): Promise<void>
  getUserFromToken(accessToken: string): Promise<AuthIdentity | null>
}
