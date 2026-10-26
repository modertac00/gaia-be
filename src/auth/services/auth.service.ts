import { ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common'
import { type ConfigType } from '@nestjs/config'
import type {
  AuthSession,
  AuthUser,
  ForgotPasswordDto,
  LoginDto,
  MessageResponse,
  RefreshTokenDto,
  ResetPasswordDto,
  SignupDto,
} from '@moderta/api-contracts/gaia'
import {
  type AuthenticatedUser,
  USER_ACCESS_RESOLVER,
  type UserAccessResolver,
} from '@/common/auth'
import { appConfig } from '@/config'
import { toHttpException } from '@/auth/utils/auth-errors'
import { toAuthSession, toAuthUser } from '@/auth/utils/auth-mapper'
import { AUTH_RESPONSE_MESSAGES } from '@moderta/api-contracts/gaia'
import { AUTH_PROVIDER, type AuthProvider, AuthProviderError, type ProviderSession } from '@/auth/interfaces/auth-provider.interface'

const RECOVERY_AUTH_METHOD = 'recovery'

// will move this to constants later, when reset password properly implemented
const RESET_PASSWORD_PATH = '/auth/reset-password'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    @Inject(AUTH_PROVIDER) private readonly provider: AuthProvider,
    @Inject(USER_ACCESS_RESOLVER) private readonly accessResolver: UserAccessResolver,
    @Inject(appConfig.KEY) private readonly app: ConfigType<typeof appConfig>,
  ) { }

  async signup(dto: SignupDto): Promise<AuthSession> {
    return this.run(async () => {
      await this.provider.createAccount(dto)
      return this.toGaiaSession(await this.provider.signInWithPassword(dto.email, dto.password))
    })
  }

  async login(dto: LoginDto): Promise<AuthSession> {
    return this.run(async () => this.toGaiaSession(await this.provider.signInWithPassword(dto.email, dto.password)))
  }

  async refresh(dto: RefreshTokenDto): Promise<AuthSession> {
    return this.run(async () => this.toGaiaSession(await this.provider.refreshSession(dto.refreshToken)))
  }

  async logout(accessToken: string): Promise<MessageResponse> {
    await this.run(() => this.provider.signOut(accessToken))
    return { message: AUTH_RESPONSE_MESSAGES.LOGGED_OUT }
  }

  getProfile(user: AuthenticatedUser): AuthUser {
    return toAuthUser(user, user)
  }

  async forgotPassword({ email }: ForgotPasswordDto): Promise<MessageResponse> {
    try {
      await this.provider.sendPasswordReset(email, `${this.app.frontendUrl}${RESET_PASSWORD_PATH}`)
    } catch (error) {
      if (!(error instanceof AuthProviderError)) throw error
      this.logger.warn(`Password reset email could not be requested (${error.kind})`)
    }
    return { message: AUTH_RESPONSE_MESSAGES.FORGOT_PASSWORD }
  }

  async resetPassword(user: AuthenticatedUser, { password }: ResetPasswordDto): Promise<MessageResponse> {
    if (!user.authMethods.includes(RECOVERY_AUTH_METHOD)) {
      throw new ForbiddenException(AUTH_RESPONSE_MESSAGES.RESET_TOKEN_REQUIRED)
    }

    await this.run(async () => {
      await this.provider.updatePassword(user.id, password)
      await this.provider.signOut(user.accessToken, 'global')
    })
    return { message: AUTH_RESPONSE_MESSAGES.PASSWORD_RESET }
  }

  private async toGaiaSession(session: ProviderSession): Promise<AuthSession> {
    const access = await this.accessResolver.resolve(session.identity)

    if (!access) {
      await this.revokeQuietly(session.accessToken)
      throw new ForbiddenException(AUTH_RESPONSE_MESSAGES.NO_GAIA_ACCESS)
    }

    return toAuthSession(session, access)
  }

  private async revokeQuietly(accessToken: string): Promise<void> {
    try {
      await this.provider.signOut(accessToken)
    } catch {
      this.logger.warn('Could not revoke the session of a non-Gaia account')
    }
  }

  private async run<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      if (error instanceof AuthProviderError) throw toHttpException(error)
      throw error
    }
  }
}
