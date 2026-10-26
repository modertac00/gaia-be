import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { DEFAULT_GAIA_ROLE, GAIA_APP_METADATA_KEY } from '@moderta/api-contracts/gaia'
import type { AuthError, Session, SignOutScope } from '@supabase/supabase-js'
import type { AuthIdentity } from '@moderta/api-contracts/gaia'
import { SupabaseService } from '@/supabase/supabase.service'
import {
  type AuthProvider,
  AuthProviderError,
  type AuthProviderErrorKind,
  type CreateAccountInput,
  type ProviderSession,
} from '../interfaces/auth-provider.interface'
import {
  AUTH_PROVIDER_ERROR_KIND as ERROR_KIND,
  AUTH_SIGN_OUT_SCOPE,
  SUPABASE_AUTH_ERROR_CODE,
  SUPABASE_EMAIL_TAKEN_CODES,
  SUPABASE_USER_METADATA_KEY,
} from '@/auth/constants/auth.constants'
import { readAuthMethods, toAuthIdentity } from '@/auth/utils/supabase-user-mapper'

function toProviderError(error: AuthError, clientError: AuthProviderErrorKind): AuthProviderError {
  if (error.status === HttpStatus.TOO_MANY_REQUESTS) return new AuthProviderError(ERROR_KIND.RATE_LIMITED)
  if (!error.status || error.status >= HttpStatus.INTERNAL_SERVER_ERROR) return new AuthProviderError(ERROR_KIND.UNAVAILABLE)
  return new AuthProviderError(clientError)
}

function toProviderSession(session: Session): ProviderSession {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at,
    identity: toAuthIdentity(session.user),
  }
}

@Injectable()
export class SupabaseAuthProvider implements AuthProvider {
  constructor(@Inject(SupabaseService) private readonly supabase: SupabaseService) { }

  async signInWithPassword(email: string, password: string): Promise<ProviderSession> {
    const { data, error } = await this.supabase.getPublicClient().auth.signInWithPassword({ email, password })
    if (error) throw toProviderError(error, ERROR_KIND.INVALID_CREDENTIALS)
    if (!data.session) throw new AuthProviderError(ERROR_KIND.UNAVAILABLE)

    return toProviderSession(data.session)
  }

  async createAccount({ email, password, name }: CreateAccountInput): Promise<AuthIdentity> {
    const { data, error } = await this.supabase.getAdminClient().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { [SUPABASE_USER_METADATA_KEY.NAME]: name },
      app_metadata: { [GAIA_APP_METADATA_KEY]: { roles: [DEFAULT_GAIA_ROLE] } },
    })

    if (error) {
      if (error.code && SUPABASE_EMAIL_TAKEN_CODES.includes(error.code)) throw new AuthProviderError(ERROR_KIND.EMAIL_TAKEN)
      if (error.code === SUPABASE_AUTH_ERROR_CODE.WEAK_PASSWORD) throw new AuthProviderError(ERROR_KIND.WEAK_PASSWORD)
      throw toProviderError(error, ERROR_KIND.BAD_REQUEST)
    }

    return toAuthIdentity(data.user)
  }

  async refreshSession(refreshToken: string): Promise<ProviderSession> {
    const { data, error } = await this.supabase.getPublicClient().auth.refreshSession({ refresh_token: refreshToken })
    if (error) throw toProviderError(error, ERROR_KIND.INVALID_TOKEN)
    if (!data.session) throw new AuthProviderError(ERROR_KIND.INVALID_TOKEN)

    return toProviderSession(data.session)
  }

  async signOut(accessToken: string, scope: SignOutScope = AUTH_SIGN_OUT_SCOPE.LOCAL): Promise<void> {
    const { error } = await this.supabase.getAdminClient().auth.admin.signOut(accessToken, scope)
    if (error) throw toProviderError(error, ERROR_KIND.INVALID_TOKEN)
  }

  async sendPasswordReset(email: string, redirectTo: string): Promise<void> {
    const { error } = await this.supabase.getPublicClient().auth.resetPasswordForEmail(email, { redirectTo })
    if (error) throw toProviderError(error, ERROR_KIND.UNAVAILABLE)
  }

  async updatePassword(userId: string, password: string): Promise<void> {
    const { error } = await this.supabase.getAdminClient().auth.admin.updateUserById(userId, { password })

    if (error) {
      if (error.code === SUPABASE_AUTH_ERROR_CODE.WEAK_PASSWORD) throw new AuthProviderError(ERROR_KIND.WEAK_PASSWORD)
      if (error.code === SUPABASE_AUTH_ERROR_CODE.SAME_PASSWORD) throw new AuthProviderError(ERROR_KIND.SAME_PASSWORD)
      throw toProviderError(error, ERROR_KIND.BAD_REQUEST)
    }
  }

  async getUserFromToken(accessToken: string): Promise<AuthIdentity | null> {
    const { data, error } = await this.supabase.getPublicClient().auth.getUser(accessToken)

    if (error) {
      if (error.status && error.status < HttpStatus.INTERNAL_SERVER_ERROR && error.status !== HttpStatus.TOO_MANY_REQUESTS) return null
      throw toProviderError(error, ERROR_KIND.INVALID_TOKEN)
    }

    return data.user ? toAuthIdentity(data.user, readAuthMethods(accessToken)) : null
  }
}
