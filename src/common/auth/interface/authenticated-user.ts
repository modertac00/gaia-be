import type { AuthUser } from '@moderta/api-contracts/gaia'
import type { Request } from 'express'

export type AuthenticatedUser = AuthUser & { accessToken: string; authMethods: string[] }

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser
}
