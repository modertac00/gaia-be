import { Global, Module } from '@nestjs/common'
import { AppLogger } from './logger.interface'
import { NestAppLogger } from './nest-app.logger'

@Global()
@Module({
  providers: [{ provide: AppLogger, useClass: NestAppLogger }],
  exports: [AppLogger],
})
export class LoggerModule { }
