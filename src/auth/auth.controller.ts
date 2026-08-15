import { Body, Controller, Get, Headers, Post, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password)
  }

  @Get('me')
  async me(@Headers('authorization') authorization?: string) {
    const token = this.extractBearerToken(authorization)

    if (!token) {
      throw new UnauthorizedException('Missing bearer token')
    }

    const payload = await this.jwtService.verifyAsync<{ sub: string }>(token)
    return this.authService.getCurrentUser(payload.sub)
  }

  private extractBearerToken(authorization?: string): string | null {
    const [scheme, token] = authorization?.split(' ') ?? []
    return scheme?.toLowerCase() === 'bearer' && token ? token : null
  }
}
