/** Shared, fail-closed migration manifest and ledger consistency checks.
 * Both the read-only planner and the transactional runner MUST use this module.
 */
import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

export interface Migration {
  filename: string
  sql: string
  sha256: string
}
export interface AppliedMigration {
  filename: string
  sha256: string
}
export interface MigrationPlan {
  pending: Migration[]
  applied: number
  ledger: boolean
}

export async function loadMigrations(directory = join(process.cwd(), 'migrations')): Promise<Migration[]> {
  const files = (await readdir(directory)).filter(name => name.endsWith('.sql')).sort()
  if (files.length === 0) throw Error('No migration SQL files found; refusing to treat missing migrations as current')
  return Promise.all(files.map(async (filename, index) => {
    const match = /^(\d{3,})_[a-z][a-z0-9_]*\.sql$/.exec(filename)
    if (!match || Number(match[1]) !== index + 1) {
      throw Error(`Migration filename/order invalid: ${filename}; require contiguous 001_*, 002_*, ... filenames`)
    }
    const contents = await readFile(join(directory, filename))
    if (!contents.toString('utf8').trim()) throw Error(`Empty SQL migration: ${filename}`)
    return { filename, sql: contents.toString('utf8'), sha256: createHash('sha256').update(contents).digest('hex') }
  }))
}

export function validatePlan(
  migrations: Migration[],
  appliedRows: AppliedMigration[],
  ledger: boolean,
  existingTables: string[],
): MigrationPlan {
  if (!migrations.length) throw Error('Migration manifest empty')
  if (!ledger && appliedRows.length) throw Error('Migration rows exist without a ledger')
  if (existingTables.length && appliedRows.length === 0) {
    throw Error('Existing Gaia tables but no recorded migrations: use the approved baseline workflow; refusing SQL replay')
  }
  if (!existingTables.length && appliedRows.length) {
    throw Error('Migration ledger contains applied entries but application tables are missing')
  }
  if (appliedRows.length > migrations.length) throw Error('Ledger has more migrations than checked-in SQL files')
  const seen = new Set<string>()
  for (let index = 0; index < appliedRows.length; index++) {
    const applied = appliedRows[index]
    if (seen.has(applied.filename)) throw Error(`Duplicate migration ledger entry: ${applied.filename}`)
    seen.add(applied.filename)
    const expected = migrations[index]
    if (!expected || expected.filename !== applied.filename) {
      throw Error(`Out-of-order, missing, or unknown applied migration: ${applied.filename}`)
    }
    if (expected.sha256 !== applied.sha256) {
      throw Error(`Migration checksum mismatch for ${applied.filename}; never edit an applied SQL migration`)
    }
  }
  return { pending: migrations.slice(appliedRows.length), applied: appliedRows.length, ledger }
}
