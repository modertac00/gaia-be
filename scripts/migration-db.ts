import type { PoolClient } from 'pg'
import type { AppliedMigration } from './migration-utils'

/** Migration ledger belongs to the migrator. The application role receives SELECT only. */
export const CREATE_LEDGER_SQL = `CREATE TABLE public.schema_migrations (
  filename text PRIMARY KEY,
  sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  applied_at timestamptz NOT NULL DEFAULT now()
)`

export async function readMigrationState(client: Pick<PoolClient, 'query'>): Promise<{
  ledger: boolean
  tables: string[]
  applied: AppliedMigration[]
}> {
  const found = await client.query("SELECT to_regclass('public.schema_migrations') AS ledger")
  const ledger = Boolean(found.rows[0]?.ledger)
  const tables = await client.query(`SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> 'schema_migrations'
    ORDER BY tablename`)
  const applied = ledger
    ? (await client.query('SELECT filename, sha256 FROM public.schema_migrations ORDER BY filename')).rows
    : []
  return { ledger, tables: tables.rows.map(row => String(row.tablename)), applied }
}

export async function grantLedgerRead(client: Pick<PoolClient, 'query'>): Promise<void> {
  await client.query('GRANT SELECT ON public.schema_migrations TO gaia_app')
}
