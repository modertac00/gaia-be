import type { QueryInterface } from 'sequelize'
import type { MigrationFn } from 'umzug'

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.sequelize.query('delete from research_reading_list', { transaction })

    await queryInterface.sequelize.query(
      `do $$
      declare foreign_key text;
      begin
        for foreign_key in
          select constraint_row.conname
          from pg_constraint constraint_row
          join pg_attribute column_row
            on column_row.attrelid = constraint_row.conrelid and column_row.attnum = any (constraint_row.conkey)
          where constraint_row.conrelid = 'research_reading_list'::regclass
            and constraint_row.contype = 'f'
            and column_row.attname = 'source_id'
        loop
          execute format('alter table research_reading_list drop constraint %I', foreign_key);
        end loop;
      end $$`,
      { transaction },
    )

    await queryInterface.sequelize.query(
      `alter table research_reading_list
        add column reason text not null,
        add column title text not null,
        add column authors jsonb not null default '[]'::jsonb,
        add column year integer,
        add column venue text,
        add column doi text,
        add column paper_url text,
        add column cited_by_count integer`,
      { transaction },
    )

    await queryInterface.sequelize.query('alter table research add column related_links_generated_at timestamptz', { transaction })
  })
}

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.sequelize.query('alter table research drop column related_links_generated_at', { transaction })

    // The foreign key needs a source for every row; papers that were never added have none.
    await queryInterface.sequelize.query('delete from research_reading_list', { transaction })

    await queryInterface.sequelize.query(
      `alter table research_reading_list
        drop column reason,
        drop column title,
        drop column authors,
        drop column year,
        drop column venue,
        drop column doi,
        drop column paper_url,
        drop column cited_by_count`,
      { transaction },
    )

    await queryInterface.sequelize.query(
      `alter table research_reading_list
        add constraint research_reading_list_source_id_fkey foreign key (source_id) references source (id) on delete cascade`,
      { transaction },
    )
  })
}
