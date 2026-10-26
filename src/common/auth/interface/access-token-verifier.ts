import type { AuthIdentity } from '@moderta/api-contracts/gaia'

export const ACCESS_TOKEN_VERIFIER = Symbol('ACCESS_TOKEN_VERIFIER')

export interface AccessTokenVerifier {
  verify(accessToken: string): Promise<AuthIdentity | null>
}
