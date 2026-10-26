import { Inject, Injectable } from '@nestjs/common'
import { DEFAULT_GAIA_ROLE, GAIA_APP_METADATA_KEY } from '@moderta/api-contracts/gaia'
import type { AuthError, Session } from '@supabase/supabase-js'
import type { AuthIdentity } from '@moderta/api-contracts/gaia'
import { SupabaseService } from '../../supabase/supabase.service'
import {
  type AuthProvider,
  AuthProviderError,
  type AuthProviderErrorKind,
  type CreateAccountInput,
  type ProviderSession,
} from '../interfaces/auth-provider.interface'
import { readAuthMethods, toAuthIdentity } from '../utils/supabase-user.mapper'

const EMAIL_TAKEN_CODES = ['email_exists', 'user_already_exists']

function toProviderError(error: AuthError, clientError: AuthProviderErrorKind): AuthProviderError {
  if (error.status === 429) return new AuthProviderError('rate_limited')
  if (!error.status || error.status >= 500) return new AuthProviderError('unavailable')
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
    if (error) throw toProviderError(error, 'invalid_credentials')
    if (!data.session) throw new AuthProviderError('unavailable')

    return toProviderSession(data.session)
  }

  async createAccount({ email, password, name }: CreateAccountInput): Promise<AuthIdentity> {
    const { data, error } = await this.supabase.getAdminClient().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
      app_metadata: { [GAIA_APP_METADATA_KEY]: { roles: [DEFAULT_GAIA_ROLE] } },
    })

    if (error) {
      if (error.code && EMAIL_TAKEN_CODES.includes(error.code)) throw new AuthProviderError('email_taken')
      if (error.code === 'weak_password') throw new AuthProviderError('weak_password')
      throw toProviderError(error, 'bad_request')
    }

    return toAuthIdentity(data.user)
  }

  async refreshSession(refreshToken: string): Promise<ProviderSession> {
    const { data, error } = await this.supabase.getPublicClient().auth.refreshSession({ refresh_token: refreshToken })
    if (error) throw toProviderError(error, 'invalid_token')
    if (!data.session) throw new AuthProviderError('invalid_token')

    return toProviderSession(data.session)
  }

  async signOut(accessToken: string, scope: 'local' | 'global' = 'local'): Promise<void> {
    const { error } = await this.supabase.getAdminClient().auth.admin.signOut(accessToken, scope)
    if (error) throw toProviderError(error, 'invalid_token')
  }

  async sendPasswordReset(email: string, redirectTo: string): Promise<void> {
    const { error } = await this.supabase.getPublicClient().auth.resetPasswordForEmail(email, { redirectTo })
    if (error) throw toProviderError(error, 'unavailable')
  }

  async updatePassword(userId: string, password: string): Promise<void> {
    const { error } = await this.supabase.getAdminClient().auth.admin.updateUserById(userId, { password })

    if (error) {
      if (error.code === 'weak_password') throw new AuthProviderError('weak_password')
      if (error.code === 'same_password') throw new AuthProviderError('same_password')
      throw toProviderError(error, 'bad_request')
    }
  }

  async getUserFromToken(accessToken: string): Promise<AuthIdentity | null> {
    const { data, error } = await this.supabase.getPublicClient().auth.getUser(accessToken)

    if (error) {
      if (error.status && error.status < 500 && error.status !== 429) return null
      throw toProviderError(error, 'invalid_token')
    }

    return data.user ? toAuthIdentity(data.user, readAuthMethods(accessToken)) : null
  }
}
