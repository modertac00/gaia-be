import { Inject, Injectable } from '@nestjs/common'
import type { AuthIdentity } from '@moderta/api-contracts/gaia'
import type { AccessTokenVerifier } from '@/common/auth'
import { toHttpException } from '@/auth/utils/auth-errors'
import { AUTH_PROVIDER, type AuthProvider, AuthProviderError } from '@/auth/interfaces/auth-provider.interface'

@Injectable()
export class SupabaseAccessTokenVerifier implements AccessTokenVerifier {
  constructor(@Inject(AUTH_PROVIDER) private readonly provider: AuthProvider) { }

  async verify(accessToken: string): Promise<AuthIdentity | null> {
    try {
      return await this.provider.getUserFromToken(accessToken)
    } catch (error) {
      if (error instanceof AuthProviderError) throw toHttpException(error)
      throw error
    }
  }
}
