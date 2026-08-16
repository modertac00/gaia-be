import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createPool } from './db'

async function migrate() {
  const pool = createPool()
  const migrationsPath = join(process.cwd(), 'migrations')
  const migrationFiles = (await readdir(migrationsPath))
    .filter((fileName) => fileName.endsWith('.sql'))
    .sort()

  try {
    for (const migrationFile of migrationFiles) {
      const sql = await readFile(join(migrationsPath, migrationFile), 'utf8')
      await pool.query(sql)
      console.log(`Applied ${migrationFile}`)
    }

    console.log('Database migration completed')
  } finally {
    await pool.end()
  }
}

void migrate()
