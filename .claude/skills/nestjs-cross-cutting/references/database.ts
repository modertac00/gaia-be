// Split into: src/database/database.module.ts, src/database/transaction-runner.ts,
//             src/common/database/repository-options.ts
import { Global, Injectable, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectConnection, SequelizeModule } from '@nestjs/sequelize'
import type { Transaction } from 'sequelize'
import { Sequelize } from 'sequelize-typescript'
import type { Env } from '../config/env.config'

// repository-options.ts — the only Sequelize type allowed in repository interfaces.
export interface RepositoryOptions {
  transaction?: Transaction
}

// transaction-runner.ts — port so services never import Sequelize.
export const TRANSACTION_RUNNER = Symbol('TRANSACTION_RUNNER')

export interface TransactionRunner {
  run<T>(work: (options: RepositoryOptions) => Promise<T>): Promise<T>
}

@Injectable()
export class SequelizeTransactionRunner implements TransactionRunner {
  constructor(@InjectConnection() private readonly sequelize: Sequelize) {}

  run<T>(work: (options: RepositoryOptions) => Promise<T>): Promise<T> {
    return this.sequelize.transaction((transaction) => work({ transaction }))
  }
}

// database.module.ts
@Global()
@Module({
  imports: [
    SequelizeModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        dialect: 'postgres',
        uri: config.get('DATABASE_URL', { infer: true }),
        autoLoadModels: true,
        synchronize: false, // schema changes only via migrations
        logging: false,
        define: { underscored: true, timestamps: true },
      }),
    }),
  ],
  providers: [{ provide: TRANSACTION_RUNNER, useClass: SequelizeTransactionRunner }],
  exports: [TRANSACTION_RUNNER],
})
export class DatabaseModule {}

// Service usage:
// constructor(@Inject(TRANSACTION_RUNNER) private readonly tx: TransactionRunner, ...) {}
// return this.tx.run(async (options) => {
//   const note = await this.notes.create(input, options)
//   await this.sections.createMany(note.id, sections, options)
//   return note
// })
