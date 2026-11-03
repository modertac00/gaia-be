import type { QueryInterface } from 'sequelize'
import type { MigrationFn } from 'umzug'

// Migrations are immutable snapshots of the schema at that time: every value below is frozen here
// on purpose and must not be read from the live contracts (which may change later).

// Placeholder owner for legacy rows that had no requester (created_by is NOT NULL).
const UNOWNED_LEGACY_USER_ID = '00000000-0000-0000-0000-000000000000'
const LEGACY_MIN_SOURCES = 8

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.transaction(async (transaction) => {
    const sql = (statement: string) => queryInterface.sequelize.query(statement, { transaction })

    await sql('create sequence if not exists research_doc_key_seq')
    await sql(`
      alter table research
        add column doc_key text,
        add column description text,
        add column citation_style text not null default 'apa_7',
        add column pub_year_from integer,
        add column pub_year_to integer,
        add column min_sources integer,
        add column created_by uuid,
        add column approved_by_user_id uuid,
        add column identified integer not null default 0,
        add column duplicates integer not null default 0,
        add column screened integer not null default 0,
        add column excluded integer not null default 0,
        add column full_text integer not null default 0,
        add column included integer not null default 0,
        add column clarification jsonb
    `)

    // Backfill legacy rows (oldest first so doc keys follow creation order).
    await sql(`
      do $$
      declare legacy record;
      begin
        for legacy in select id from research order by created_at, id loop
          update research set doc_key = 'D-' || nextval('research_doc_key_seq') where id = legacy.id;
        end loop;
      end $$
    `)
    await sql(`
      update research set
        description = topic,
        created_by = coalesce(requested_by_user_id, '${UNOWNED_LEGACY_USER_ID}'::uuid),
        pub_year_from = extract(year from created_at)::integer,
        pub_year_to = extract(year from now())::integer,
        min_sources = ${LEGACY_MIN_SOURCES},
        status = 'draft',
        research_type = case
          when lower(trim(research_type)) in ('academic', 'business', 'market', 'sustainability')
            then lower(trim(research_type))
          else 'academic'
        end
    `)

    await sql(`
      alter table research
        alter column doc_key set default ('D-' || nextval('research_doc_key_seq')),
        alter column doc_key set not null,
        alter column pub_year_from set not null,
        alter column pub_year_to set not null,
        alter column min_sources set not null,
        alter column created_by set not null,
        alter column status set default 'draft',
        alter column topic drop not null,
        add constraint research_doc_key_unique unique (doc_key)
    `)
    await sql('alter sequence research_doc_key_seq owned by research.doc_key')

    // Users live in Supabase; user ids are plain uuids from now on.
    await sql('alter table research drop constraint if exists research_requested_by_user_id_fkey')

    await sql(`
      alter table research
        add constraint research_research_type_check
          check (research_type in ('academic', 'business', 'market', 'sustainability')),
        add constraint research_status_check
          check (status in ('draft', 'verification_required', 'verified')),
        add constraint research_citation_style_check
          check (citation_style in ('apa_7', 'harvard', 'chicago', 'ieee')),
        add constraint research_pub_year_order_check check (pub_year_from <= pub_year_to),
        add constraint research_min_sources_check check (min_sources >= 1)
    `)
  })
}

// Lossy: legacy status ('queued', ...) and research_type spelling were overwritten by up and are not restored;
// rows created after up keep requested_by_user_id NULL (their owners are not in app_users).
export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.transaction(async (transaction) => {
    const sql = (statement: string) => queryInterface.sequelize.query(statement, { transaction })

    await sql(`
      alter table research
        drop constraint if exists research_research_type_check,
        drop constraint if exists research_status_check,
        drop constraint if exists research_citation_style_check,
        drop constraint if exists research_pub_year_order_check,
        drop constraint if exists research_min_sources_check
    `)
    await sql('update research set topic = coalesce(topic, description, title)')
    await sql(`
      alter table research
        add constraint research_requested_by_user_id_fkey foreign key (requested_by_user_id) references app_users(id),
        alter column topic set not null,
        alter column status set default 'queued'
    `)
    await sql(`
      alter table research
        drop column doc_key,
        drop column description,
        drop column citation_style,
        drop column pub_year_from,
        drop column pub_year_to,
        drop column min_sources,
        drop column created_by,
        drop column approved_by_user_id,
        drop column identified,
        drop column duplicates,
        drop column screened,
        drop column excluded,
        drop column full_text,
        drop column included,
        drop column clarification
    `)
    await sql('drop sequence if exists research_doc_key_seq')
  })
}
