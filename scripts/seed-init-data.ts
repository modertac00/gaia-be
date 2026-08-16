import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createPool } from './db'

const INIT_DATA_KEY = 'research-library'

async function seedInitData() {
  const pool = createPool()
  const dataPath = join(process.cwd(), 'src/init/init-data.json')
  const payload = JSON.parse(await readFile(dataPath, 'utf8'))

  try {
    await pool.query(
      `
        insert into app_init_data (key, payload)
        values ($1, $2::jsonb)
        on conflict (key) do update
        set payload = excluded.payload
      `,
      [INIT_DATA_KEY, JSON.stringify(payload)],
    )

    console.log(`Seeded init data: ${INIT_DATA_KEY}`)
  } finally {
    await pool.end()
  }
}

void seedInitData()
