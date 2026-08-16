import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { AuthService } from '../auth/auth.service'
import { InitService } from './init.service'

@Controller('init')
export class InitController {
  constructor(
    private readonly authService: AuthService,
    private readonly initService: InitService,
    private readonly jwtService: JwtService,
  ) {}

  @Get()
  async getInitData(@Headers('authorization') authorization?: string) {
    await this.assertAuthenticated(authorization)

    return this.initService.getInitData()
  }

  async assertAuthenticated(authorization?: string) {
    const token = this.extractBearerToken(authorization)

    if (!token) {
      throw new UnauthorizedException('Missing bearer token')
    }

    const payload = await this.jwtService.verifyAsync<{ sub: string }>(token)
    await this.authService.getCurrentUser(payload.sub)
  }

  private extractBearerToken(authorization?: string): string | null {
    const [scheme, token] = authorization?.split(' ') ?? []
    return scheme?.toLowerCase() === 'bearer' && token ? token : null
  }
}
