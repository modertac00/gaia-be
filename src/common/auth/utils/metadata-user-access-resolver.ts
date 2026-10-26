import { Inject, Injectable } from '@nestjs/common'
import { GAIA_APP_METADATA_KEY, gaiaAppMetadataSchema } from '@moderta/api-contracts/gaia'
import type { AuthIdentity } from '@moderta/api-contracts/gaia'
import { RoleAbilityRegistry } from './role-ability-registry'
import type { UserAccess, UserAccessResolver } from '@/common/auth/interface/user-access-resolver'

@Injectable()
export class MetadataUserAccessResolver implements UserAccessResolver {
  constructor(@Inject(RoleAbilityRegistry) private readonly registry: RoleAbilityRegistry) { }

  async resolve(identity: AuthIdentity): Promise<UserAccess | null> {
    const parsed = gaiaAppMetadataSchema.safeParse(identity.appMetadata[GAIA_APP_METADATA_KEY])
    if (!parsed.success) return null

    const { roles } = parsed.data
    if (!roles.length) return null

    const abilities = [...(parsed.data.abilities ?? []), ...this.registry.abilitiesFor(roles)]

    return { roles, abilities: [...new Set(abilities)] }
  }
}
