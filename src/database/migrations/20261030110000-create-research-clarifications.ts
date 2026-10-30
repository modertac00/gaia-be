import type { QueryInterface } from 'sequelize'
import type { MigrationFn } from 'umzug'

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.sequelize.query(
      `create table research_clarifications (
        id uuid primary key,
        created_by uuid not null,
        status text not null,
        brief jsonb not null,
        suggested_question jsonb,
        questions jsonb,
        error jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )`,
      { transaction },
    )
    await queryInterface.sequelize.query('create index research_clarifications_created_by_idx on research_clarifications (created_by)', {
      transaction,
    })
  })
}

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.sequelize.query('drop table research_clarifications', { transaction })
  })
}
