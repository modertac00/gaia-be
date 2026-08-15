import { Global, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Pool } from 'pg'
import { DATABASE_POOL } from './database.tokens'

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const connectionString = configService.get<string>('DATABASE_URL')

        if (!connectionString) {
          throw new Error('DATABASE_URL is required')
        }

        return new Pool({ connectionString })
      },
    },
  ],
  exports: [DATABASE_POOL],
})
export class DatabaseModule {}
