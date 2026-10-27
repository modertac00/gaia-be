import { Controller, Get } from '@nestjs/common'
import { Public } from './common/auth'

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  getHealth() {
    return { status: 'ok' }
  }
}
