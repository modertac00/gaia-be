import type { QueryInterface } from 'sequelize'
import type { MigrationFn } from 'umzug'

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.sequelize.query(
      'alter table research add column verified_source_count integer not null default 0',
      { transaction },
    )
  })
}

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.sequelize.query('alter table research drop column verified_source_count', { transaction })
  })
}
