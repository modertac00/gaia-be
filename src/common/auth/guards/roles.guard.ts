import { type CanActivate, type ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { GaiaRole } from '@moderta/api-contracts/gaia'
import type { AuthenticatedRequest } from '@/common/auth/interface/authenticated-user'
import { FORBIDDEN_MESSAGE } from '@moderta/api-contracts/gaia'
import { ROLES_KEY } from '@/common/auth/decorators/roles.decorator'
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<GaiaRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!required?.length) return true

    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user
    if (user?.roles.some((role) => required.includes(role))) return true

    throw new ForbiddenException(FORBIDDEN_MESSAGE)
  }
}
