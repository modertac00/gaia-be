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
import { NotesModule } from './research-app/notes/notes.module';
import { StorageModule } from './storage/storage.module';
import { EvidenceModule } from './research-app/evidence/evidence.module';
import { RelatedModule } from './research-app/related/related.module';
import { ExportsModule } from './research-app/exports/exports.module';
import { ResearchLinksModule } from './research-app/research-links/research-links.module';
import { AuditModule } from './research-app/audit/audit.module';
import { AiRunsModule } from './research-app/ai-runs/ai-runs.module';
import { RealtimeModule } from './realtime/realtime.module';
import { ClarificationsModule } from './research-app/clarifications/clarifications.module';

@Module({
  imports: [
    ConfigModule.forRoot(configModuleOptions),
    LoggerModule,
    DatabaseModule,
    QueueModule,
    StorageModule,
    CommonModule,
    SupabaseModule,
    AuthModule,
    ClarificationsModule,
    ResearchModule,
    AiModule,
    SourcesModule,
    NotesModule,
    EvidenceModule,
    RelatedModule,
    ExportsModule,
    ResearchLinksModule,
    AuditModule,
    AiRunsModule,
    RealtimeModule,
  ],
  controllers: [HealthController],
})
export class AppModule { }
