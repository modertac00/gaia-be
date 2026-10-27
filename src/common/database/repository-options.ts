import type { Transaction } from 'sequelize'

/** The only Sequelize type allowed in repository interfaces: an opaque transaction handle. */
export interface RepositoryOptions {
  transaction?: Transaction
}
