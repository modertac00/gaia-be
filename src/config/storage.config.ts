import { registerAs } from '@nestjs/config'
import { validateEnv } from './validate-env'

export const STORAGE_CONFIG_KEY = 'storage'

export const storageConfig = registerAs(STORAGE_CONFIG_KEY, () => {
  const env = validateEnv(process.env)

  return {
    localDir: env.STORAGE_LOCAL_DIR,
  }
})

export type StorageConfig = ReturnType<typeof storageConfig>
