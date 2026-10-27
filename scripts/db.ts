import { Pool } from 'pg'

/** Legacy scripts. Prefers the DB_* variables (no URL encoding pitfalls); DATABASE_URL is a fallback. */
export function createPool() {
  const { DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME, DATABASE_URL } = process.env

  if (DB_HOST && DB_USERNAME && DB_NAME) {
    return new Pool({
      host: DB_HOST,
      port: DB_PORT ? Number(DB_PORT) : 5432,
      user: DB_USERNAME,
      password: DB_PASSWORD,
      database: DB_NAME,
    })
  }

  if (!DATABASE_URL) {
    throw new Error('DB_HOST, DB_USERNAME and DB_NAME (or DATABASE_URL) are required')
  }

  return new Pool({ connectionString: DATABASE_URL })
}
