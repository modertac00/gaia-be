import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common'
import { Pool } from 'pg'
import { DATABASE_POOL } from './database/database.tokens'

@Controller('ready')
export class ReadyController {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  @Get()
  async getReadiness() {
    try {
      await this.pool.query('SELECT 1')
      return { status: 'ready', database: 'ok' }
    } catch {
      throw new ServiceUnavailableException({ status: 'not_ready', database: 'unavailable' })
    }
  }
}
