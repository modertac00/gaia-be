import type { AuthUser } from '@moderta/api-contracts/gaia'
import type { AuthIdentity } from '@moderta/api-contracts/gaia'

export const USER_ACCESS_RESOLVER = Symbol('USER_ACCESS_RESOLVER')

export type UserAccess = Pick<AuthUser, 'roles' | 'abilities'>

export interface UserAccessResolver {
  resolve(identity: AuthIdentity): Promise<UserAccess | null>
}
