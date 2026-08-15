import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createPool } from './db'

async function migrate() {
  const pool = createPool()
  const sql = await readFile(join(process.cwd(), 'migrations/001_auth.sql'), 'utf8')

  try {
    await pool.query(sql)
    console.log('Database migration completed')
  } finally {
    await pool.end()
  }
}

void migrate()
