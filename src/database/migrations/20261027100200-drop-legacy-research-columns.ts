import type { QueryInterface } from 'sequelize'
import type { MigrationFn } from 'umzug'

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.sequelize.query(
      'alter table research drop column topic, drop column requested_by_user_id',
      { transaction },
    )
  })
}

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.transaction(async (transaction) => {
    const sql = (statement: string) => queryInterface.sequelize.query(statement, { transaction })

    await sql('alter table research add column topic text, add column requested_by_user_id uuid')
    await sql('update research set topic = coalesce(description, title)')
  })
}
