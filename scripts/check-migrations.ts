/** Read-only plan. The migrator rechecks this plan under an advisory lock. */
import { createPool } from './db'
import { loadMigrations, validatePlan } from './migration-utils'
import { readMigrationState } from './migration-db'

async function main(): Promise<void> {
  const pool = createPool()
  try {
    const manifest = await loadMigrations()
    const state = await readMigrationState(pool)
    const plan = validatePlan(manifest, state.applied, state.ledger, state.tables)
    console.log(JSON.stringify({ status: 'pass', pending: plan.pending.length, applied: plan.applied, ledger: plan.ledger }))
    if (plan.pending.length) process.exitCode = 10
  } finally {
    await pool.end()
  }
}
main().catch(error => {
  console.error('GAIA_MIGRATION_PLAN_FAILED:', error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
