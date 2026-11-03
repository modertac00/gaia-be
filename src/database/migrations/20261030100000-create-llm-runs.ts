import type { QueryInterface } from 'sequelize'
import type { MigrationFn } from 'umzug'

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.sequelize.query(
      `create table llm_runs (
        id uuid primary key,
        research_id uuid not null references research (id) on delete cascade,
        tool text not null,
        kind text not null,
        status text not null,
        error jsonb,
        output jsonb,
        started_at timestamptz not null default now(),
        finished_at timestamptz
      )`,
      { transaction },
    )
    await queryInterface.sequelize.query('create index llm_runs_research_id_started_at_idx on llm_runs (research_id, started_at)', {
      transaction,
    })
  })
}

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.sequelize.query('drop table llm_runs', { transaction })
  })
}
