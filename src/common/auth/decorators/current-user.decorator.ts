import { createParamDecorator, type ExecutionContext, UnauthorizedException } from '@nestjs/common'
import type { AuthenticatedRequest, AuthenticatedUser } from '../interface/authenticated-user'

export const CurrentUser = createParamDecorator(
  (key: keyof AuthenticatedUser | undefined, context: ExecutionContext) => {
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user
    if (!user) throw new UnauthorizedException()
    return key ? user[key] : user
  },
)
