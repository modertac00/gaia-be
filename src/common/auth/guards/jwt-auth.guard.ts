import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ACCESS_TOKEN_VERIFIER, type AccessTokenVerifier } from '@/common/auth/interface/access-token-verifier'
import { FORBIDDEN_MESSAGE, UNAUTHORIZED_MESSAGE } from '@moderta/api-contracts/gaia'
import type { AuthenticatedRequest } from '@/common/auth/interface/authenticated-user'
import { extractBearerToken } from '@/common/auth/utils/bearer-token'
import { IS_PUBLIC_KEY } from '@/common/auth/decorators/public.decorator'
import { USER_ACCESS_RESOLVER, type UserAccessResolver } from '@/common/auth/interface/user-access-resolver'

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(ACCESS_TOKEN_VERIFIER) private readonly verifier: AccessTokenVerifier,
    @Inject(USER_ACCESS_RESOLVER) private readonly accessResolver: UserAccessResolver,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const accessToken = extractBearerToken(request.headers.authorization)
    if (!accessToken) throw new UnauthorizedException(UNAUTHORIZED_MESSAGE)

    const identity = await this.verifier.verify(accessToken)
    if (!identity) throw new UnauthorizedException(UNAUTHORIZED_MESSAGE)

    const access = await this.accessResolver.resolve(identity)
    if (!access) throw new ForbiddenException(FORBIDDEN_MESSAGE)

    request.user = {
      id: identity.id,
      email: identity.email,
      name: identity.name,
      roles: access.roles,
      abilities: access.abilities,
      accessToken,
      authMethods: identity.authMethods,
    }
    return true
  }
}
