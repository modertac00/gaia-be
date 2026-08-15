import { hash } from 'bcryptjs'
import { createPool } from './db'

async function createAccount() {
  const email = process.env.ACCOUNT_EMAIL
  const password = process.env.ACCOUNT_PASSWORD
  const name = process.env.ACCOUNT_NAME ?? 'Gaia Admin'

  if (!email || !password) {
    throw new Error('ACCOUNT_EMAIL and ACCOUNT_PASSWORD are required')
  }

  if (password.length < 8) {
    throw new Error('ACCOUNT_PASSWORD must be at least 8 characters')
  }

  const pool = createPool()

  try {
    const existing = await pool.query<{ count: string }>('select count(*) from app_users')

    if (Number(existing.rows[0]?.count ?? 0) > 0) {
      throw new Error('Account already exists. Gaia is configured for exactly one account.')
    }

    const passwordHash = await hash(password, 12)

    await pool.query(
      `
        insert into app_users (email, name, password_hash)
        values ($1, $2, $3)
      `,
      [email, name, passwordHash],
    )

    console.log(`Created Gaia account for ${email}`)
  } finally {
    await pool.end()
  }
}

void createAccount()
