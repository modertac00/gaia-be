import type { QueryInterface } from 'sequelize'
import type { MigrationFn } from 'umzug'

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.sequelize.query(
      `
      create table research_supervisors (
        id uuid primary key default gen_random_uuid(),
        research_id uuid not null references research(id) on delete cascade,
        user_id uuid not null,
        created_at timestamptz not null default now(),
        constraint research_supervisors_research_user_unique unique (research_id, user_id)
      )
    `,
      { transaction },
    )
  })
}

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.sequelize.query('drop table if exists research_supervisors', { transaction })
  })
}
