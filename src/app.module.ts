import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { DatabaseModule } from './database/database.module'
import { HealthController } from './health.controller'
import { InitModule } from './init/init.module'
import { ResearchModule } from './research/research.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
    InitModule,
    ResearchModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
