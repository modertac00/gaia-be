import { TRANSACTION_RUNNER } from '@/common/database/transaction-runner'
import { SequelizeTransactionRunner } from '@/database/sequelize-transaction-runner'
import { Global, Logger, Module } from '@nestjs/common'
import { type ConfigType } from '@nestjs/config'
import { SequelizeModule } from '@nestjs/sequelize'
import { appConfig, databaseConfig } from '@/config'

const logger = new Logger('Sequelize')

@Global()
@Module({
  imports: [
    SequelizeModule.forRootAsync({
      inject: [databaseConfig.KEY, appConfig.KEY],
      useFactory: (db: ConfigType<typeof databaseConfig>, app: ConfigType<typeof appConfig>) => ({
        dialect: db.dialect,
        host: db.host,
        port: db.port,
        username: db.username,
        password: db.password,
        database: db.database,
        autoLoadModels: true,
        synchronize: true, // schema changes only via migrations in prod(npm run db:migrate:up)
        pool: { max: 10, acquire: 30_000 },
        dialectOptions: { idle_in_transaction_session_timeout: 30_000, lock_timeout: 15_000 },
        logging: app.isDevelopment ? (sql: string) => logger.debug(sql) : false,
      }),
    }),
  ],
  providers: [{ provide: TRANSACTION_RUNNER, useClass: SequelizeTransactionRunner }],
  exports: [TRANSACTION_RUNNER],
})
export class DatabaseModule { }
