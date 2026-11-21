/** Controlled ONE-TIME reconciliation for the historic untracked 001-003 migrations.
 * Never executes migrations, modifies application tables, or deletes data.
 * See docs/GAIA_MIGRATION_RECOVERY.md for pre-approval structural/data review.
 */
import { createPool } from './db'
import { verifyInitialGaiaSchema } from './baseline-contract'
import { CREATE_LEDGER_SQL, grantLedgerRead, readMigrationState } from './migration-db'
import { loadMigrations } from './migration-utils'

const INITIAL = ['001_auth.sql', '002_init_data.sql', '003_gaia_research_core.sql']

async function main(): Promise<void> {
  const mode = process.env.GAIA_BASELINE_ACTION
  if (mode !== 'check' && mode !== 'apply') throw Error('Expected GAIA_BASELINE_ACTION=check|apply')
  if (mode === 'apply' && process.env.GAIA_BASELINE_APPROVED !== 'RECONCILE_GAIA_BASELINE') {
    throw Error('Exact, protected Gaia baseline approval missing')
  }
  const manifest = await loadMigrations()
  if (INITIAL.some((name, idx) => manifest[idx]?.filename !== name)) {
    throw Error('Initial migration filenames have changed; cannot baseline unverified history')
  }
  const pool = createPool()
  const client = await pool.connect()
  let inTransaction = false
  try {
    await client.query('BEGIN')
    inTransaction = true
    if (mode === 'check') await client.query('SET TRANSACTION READ ONLY')
    await client.query("SET LOCAL lock_timeout = '10s'")
    if (mode === 'apply') await client.query("SELECT pg_advisory_xact_lock(hashtext('moderta.gaia.schema_migrations'), 0)")
    const state = await readMigrationState(client)
    if (state.ledger) throw Error('Migration ledger already exists; baseline must never overwrite it')
    await verifyInitialGaiaSchema(client)
    console.log(JSON.stringify({ status: 'baseline-verified', mode,
      migrations: manifest.slice(0, 3).map(({ filename, sha256 }) => ({ filename, sha256 })) }))
    if (mode === 'apply') {
      await client.query(CREATE_LEDGER_SQL)
      await grantLedgerRead(client)
      for (const migration of manifest.slice(0, 3)) {
        await client.query('INSERT INTO public.schema_migrations(filename,sha256) VALUES ($1,$2)',
          [migration.filename, migration.sha256])
      }
      console.log('GAIA_BASELINE_LEDGER_RECORDED: 3 existing migrations; no application SQL executed')
    }
    await client.query('COMMIT')
    inTransaction = false
  } catch (error) {
    if (inTransaction) {
      try { await client.query('ROLLBACK') } catch (rollbackError) {
        console.error('GAIA_BASELINE_ROLLBACK_FAILED:', rollbackError)
      }
    }
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}
main().catch(error => {
  console.error('GAIA_BASELINE_FAILED:', error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
