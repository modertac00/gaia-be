import { Injectable } from '@nestjs/common'
import { InjectConnection } from '@nestjs/sequelize'
import { Sequelize } from 'sequelize-typescript'
import type { RepositoryOptions } from '@/common/database/repository-options'
import type { TransactionRunner } from '@/common/database/transaction-runner'

@Injectable()
export class SequelizeTransactionRunner implements TransactionRunner {
  constructor(@InjectConnection() private readonly sequelize: Sequelize) { }

  run<T>(work: (options: RepositoryOptions) => Promise<T>): Promise<T> {
    return this.sequelize.transaction((transaction) => work({ transaction }))
  }
}
