import 'reflect-metadata'
import { type ConfigType } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { appConfig } from './config'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const config = app.get<ConfigType<typeof appConfig>>(appConfig.KEY)

  app.enableCors({ origin: config.frontendOrigin, credentials: false })

  await app.listen(config.port)
}

void bootstrap()
