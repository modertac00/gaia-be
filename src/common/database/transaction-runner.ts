import type { RepositoryOptions } from './repository-options'

export const TRANSACTION_RUNNER = Symbol('TRANSACTION_RUNNER')

/** Port so services own the transaction boundary without importing Sequelize. */
export interface TransactionRunner {
  run<T>(work: (options: RepositoryOptions) => Promise<T>): Promise<T>
}
