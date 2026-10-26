import type { ConfigModuleOptions } from '@nestjs/config'
import { appConfig } from './app.config'
import { databaseConfig } from './database.config'
import { supabaseConfig } from './supabase.config'
import { validateEnv } from './validate-env'

export { appConfig, type AppConfig } from './app.config'
export { databaseConfig, type DatabaseConfig } from './database.config'
export { supabaseConfig, type SupabaseConfig } from './supabase.config'

export const configModuleOptions: ConfigModuleOptions = {
  isGlobal: true,
  validate: validateEnv,
  load: [appConfig, supabaseConfig, databaseConfig],
}
