import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common'
import {
  type AuthSession,
  type AuthUser,
  type ForgotPasswordDto,
  forgotPasswordSchema,
  type LoginDto,
  loginSchema,
  type MessageResponse,
  type RefreshTokenDto,
  refreshTokenSchema,
  type ResetPasswordDto,
  resetPasswordSchema,
  type SignupDto,
  signupSchema,
} from '@moderta/api-contracts/gaia'
import { type AuthenticatedUser, CurrentUser, Public } from '@/common/auth'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe'
import { AUTH_RESPONSE_MESSAGES } from '@moderta/api-contracts/gaia'
import { AuthService } from './services/auth.service'

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) { }

  @Public()
  @Post('signup')
  @ResponseMessage(AUTH_RESPONSE_MESSAGES.SIGNED_UP)
  signup(@Body(new ZodValidationPipe(signupSchema)) body: SignupDto): Promise<AuthSession> {
    return this.authService.signup(body)
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body(new ZodValidationPipe(loginSchema)) body: LoginDto): Promise<AuthSession> {
    return this.authService.login(body)
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body(new ZodValidationPipe(refreshTokenSchema)) body: RefreshTokenDto): Promise<AuthSession> {
    return this.authService.refresh(body)
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@CurrentUser('accessToken') accessToken: string): Promise<MessageResponse> {
    return this.authService.logout(accessToken)
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): AuthUser {
    return this.authService.getProfile(user)
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body(new ZodValidationPipe(forgotPasswordSchema)) body: ForgotPasswordDto): Promise<MessageResponse> {
    return this.authService.forgotPassword(body)
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(resetPasswordSchema)) body: ResetPasswordDto,
  ): Promise<MessageResponse> {
    return this.authService.resetPassword(user, body)
  }
}
