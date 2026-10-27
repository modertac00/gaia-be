import { Global, Module } from '@nestjs/common'
import { ACCESS_TOKEN_VERIFIER } from '../common/auth'
import { AuthController } from './auth.controller'
import { AuthService } from './services/auth.service'
import { AUTH_PROVIDER } from './interfaces/auth-provider.interface'
import { SupabaseAccessTokenVerifier } from './providers/supabase-access-token.verifier'
import { SupabaseAuthProvider } from './providers/supabase-auth.provider'

@Global()
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: AUTH_PROVIDER, useClass: SupabaseAuthProvider },
    { provide: ACCESS_TOKEN_VERIFIER, useClass: SupabaseAccessTokenVerifier },
  ],
  exports: [ACCESS_TOKEN_VERIFIER],
})
export class AuthModule { }
