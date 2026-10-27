import { Injectable } from '@nestjs/common'
import type { GaiaRole } from '@moderta/api-contracts/gaia'

@Injectable()
export class RoleAbilityRegistry {
  private readonly abilitiesByRole: Readonly<Record<GaiaRole, readonly string[]>> = {
    admin: [],
    researcher: [],
    reviewer: [],
  }

  abilitiesFor(roles: readonly GaiaRole[]): string[] {
    return roles.flatMap((role) => this.abilitiesByRole[role])
  }
}
