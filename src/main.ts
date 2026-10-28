import 'reflect-metadata'
import { type ConfigType } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { appConfig } from './config'
import { REQUEST_ID_HEADER } from '@/common/http/request-id'
import { setupSwagger } from '@/common/swagger'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  // Lets the queue consumers finish their in-flight messages when ECS stops the task (SIGTERM).
  app.enableShutdownHooks()
  const config = app.get<ConfigType<typeof appConfig>>(appConfig.KEY)

  app.enableCors({ origin: config.frontendOrigin, credentials: false, exposedHeaders: [REQUEST_ID_HEADER] })

  setupSwagger(app)

  await app.listen(config.port)
}

void bootstrap()
