import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { CommonModule } from './common/common.module'
import { LoggerModule } from './log/logger.module'
import { configModuleOptions } from './config'
import { DatabaseModule } from './database/database.module'
import { HealthController } from './health.controller'
import { AuthModule } from './auth/auth.module'
import { SupabaseModule } from './supabase/supabase.module'

@Module({
  imports: [
    ConfigModule.forRoot(configModuleOptions),
    LoggerModule,
    DatabaseModule,
    CommonModule,
    SupabaseModule,
    AuthModule,
  ],
  controllers: [HealthController],
})
export class AppModule { }
