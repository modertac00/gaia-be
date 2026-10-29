import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { CommonModule } from './common/common.module'
import { LoggerModule } from './log/logger.module'
import { configModuleOptions } from './config'
import { DatabaseModule } from './database/database.module'
import { HealthController } from './health.controller'
import { AuthModule } from './auth/auth.module'
import { SupabaseModule } from './supabase/supabase.module'
import { ResearchModule } from './research-app/research/research.module';
import { SourcesModule } from './research-app/sources/sources.module';
import { QueueModule } from './queue/queue.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot(configModuleOptions),
    LoggerModule,
    DatabaseModule,
    QueueModule,
    CommonModule,
    SupabaseModule,
    AuthModule,
    ResearchModule,
    AiModule,
    SourcesModule,
  ],
  controllers: [HealthController],
})
export class AppModule { }
