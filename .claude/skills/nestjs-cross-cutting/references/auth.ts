// Split into: src/common/auth/{authenticated-user.ts,public.decorator.ts,current-user.decorator.ts,jwt-auth.guard.ts}
import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import type { Request } from 'express'

// authenticated-user.ts — the only user shape controllers/services see.
// If a PublicUser contract exists in @moderta/api-contracts/gaia, alias it instead.
export interface AuthenticatedUser {
  id: string
  email: string
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser
}

// public.decorator.ts
export const IS_PUBLIC_KEY = 'isPublic'
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)

// current-user.decorator.ts
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthenticatedUser => {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
  if (!request.user) throw new UnauthorizedException()
  return request.user
})

// jwt-auth.guard.ts — single place that parses the bearer token.
interface JwtPayload {
  sub: string
  email: string
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const token = extractBearerToken(request.headers.authorization)
    if (!token) throw new UnauthorizedException()

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token)
      request.user = { id: payload.sub, email: payload.email }
      return true
    } catch {
      throw new UnauthorizedException()
    }
  }
}

function extractBearerToken(header: string | undefined): string | null {
  const [scheme, token] = header?.split(' ') ?? []
  return scheme?.toLowerCase() === 'bearer' && token ? token : null
}

// If a route must confirm the user still exists, do it in the guard via an
// injected USER_LOOKUP port token, not in each controller.
