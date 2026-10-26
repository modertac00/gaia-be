import type { AuthSession, AuthUser } from '@moderta/api-contracts/gaia'
import type { AuthIdentity } from '@moderta/api-contracts/gaia'
import type { UserAccess } from '../../common/auth'
import type { ProviderSession } from '../interfaces/auth-provider.interface'

export function toAuthUser(identity: Pick<AuthIdentity, 'id' | 'email' | 'name'>, access: UserAccess): AuthUser {
  return {
    id: identity.id,
    email: identity.email,
    name: identity.name,
    roles: access.roles,
    abilities: access.abilities,
  }
}

export function toAuthSession(session: ProviderSession, access: UserAccess): AuthSession {
  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    ...(session.expiresAt !== undefined && { expiresAt: session.expiresAt }),
    user: toAuthUser(session.identity, access),
  }
}
