/** Transactional SQL migrator. Applies each missing migration exactly once.
 * BEGIN + an advisory transaction lock + replan protect against concurrent runs.
 * On any failure, both SQL changes and ledger writes roll back together.
 */
import { createPool } from './db'
import { CREATE_LEDGER_SQL, grantLedgerRead, readMigrationState } from './migration-db'
import { loadMigrations, validatePlan } from './migration-utils'

async function migrate(): Promise<void> {
  const manifest = await loadMigrations()
  const pool = createPool()
  const client = await pool.connect()
  let inTransaction = false
  try {
    await client.query('BEGIN')
    inTransaction = true
    await client.query("SET LOCAL lock_timeout = '10s'")
    await client.query("SELECT pg_advisory_xact_lock(hashtext('moderta.gaia.schema_migrations'), 0)")
    const state = await readMigrationState(client)
    const plan = validatePlan(manifest, state.applied, state.ledger, state.tables)
    if (!state.ledger) {
      await client.query(CREATE_LEDGER_SQL)
      await grantLedgerRead(client)
    }
    const appliedNow: typeof plan.pending = []
    for (const migration of plan.pending) {
      // SQL files must contain only PostgreSQL transaction-compatible statements.
      await client.query(migration.sql)
      await client.query(
        'INSERT INTO public.schema_migrations (filename, sha256) VALUES ($1, $2)',
        [migration.filename, migration.sha256],
      )
      appliedNow.push(migration)
    }
    await client.query('COMMIT')
    inTransaction = false
    for (const migration of appliedNow) console.log(`Applied ${migration.filename} sha256=${migration.sha256}`)
    console.log(JSON.stringify({ status: 'pass', applied: appliedNow.length, skipped: plan.applied }))
  } catch (error) {
    if (inTransaction) {
      try { await client.query('ROLLBACK') } catch (rollbackError) {
        console.error('GAIA_MIGRATION_ROLLBACK_FAILED:', rollbackError)
      }
    }
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}
migrate().catch(error => {
  console.error('GAIA_MIGRATION_FAILED:', error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
