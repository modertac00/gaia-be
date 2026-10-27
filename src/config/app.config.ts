import { registerAs } from '@nestjs/config'
import { validateEnv } from './validate-env'

export const APP_CONFIG_KEY = 'app'

export const appConfig = registerAs(APP_CONFIG_KEY, () => {
  const env = validateEnv(process.env)
  const frontendUrl = env.FRONTEND_URL.replace(/\/+$/, '')

  return {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    isDevelopment: env.NODE_ENV === 'development',
    frontendUrl,
    frontendOrigin: new URL(frontendUrl).origin,
  }
})

export type AppConfig = ReturnType<typeof appConfig>
