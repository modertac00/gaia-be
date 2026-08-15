import { Inject, Injectable } from '@nestjs/common'
import { Pool } from 'pg'
import { DATABASE_POOL } from '../database/database.tokens'
import type { UserRow } from './user.types'

@Injectable()
export class UsersRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async findByEmail(email: string): Promise<UserRow | null> {
    const result = await this.pool.query<UserRow>(
      `
        select id, email, name, password_hash, created_at, updated_at
        from app_users
        where lower(email) = lower($1)
        limit 1
      `,
      [email],
    )

    return result.rows[0] ?? null
  }

  async findById(id: string): Promise<UserRow | null> {
    const result = await this.pool.query<UserRow>(
      `
        select id, email, name, password_hash, created_at, updated_at
        from app_users
        where id = $1
        limit 1
      `,
      [id],
    )

    return result.rows[0] ?? null
  }
}
