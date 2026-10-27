import type { INestApplication } from '@nestjs/common'
import { type ConfigType } from '@nestjs/config'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { appConfig } from '@/config'

export const SWAGGER_PATH = 'docs'

export function setupSwagger(app: INestApplication): void {
  const config = app.get<ConfigType<typeof appConfig>>(appConfig.KEY)
  if (config.nodeEnv === 'production') return

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('Gaia API').setVersion('1.0').addBearerAuth().build(),
  )
  SwaggerModule.setup(SWAGGER_PATH, app, document)
}
