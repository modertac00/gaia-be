import { registerAs } from '@nestjs/config'
import { validateEnv } from './validate-env'

export const DATABASE_CONFIG_KEY = 'database'

export const databaseConfig = registerAs(DATABASE_CONFIG_KEY, () => {
  const env = validateEnv(process.env)

  return {
    dialect: env.DB_TYPE,
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  }
})

export type DatabaseConfig = ReturnType<typeof databaseConfig>
