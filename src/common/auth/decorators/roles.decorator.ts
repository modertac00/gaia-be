import { SetMetadata } from '@nestjs/common'
import type { GaiaRole } from '@moderta/api-contracts/gaia'

export const ROLES_KEY = 'roles'
export const Roles = (...roles: GaiaRole[]) => SetMetadata(ROLES_KEY, roles)
