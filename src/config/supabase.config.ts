import { registerAs } from '@nestjs/config'
import { validateEnv } from './validate-env'

export const SUPABASE_CONFIG_KEY = 'supabase'

export const supabaseConfig = registerAs(SUPABASE_CONFIG_KEY, () => {
  const env = validateEnv(process.env)

  return {
    url: env.SUPABASE_URL,
    anonKey: env.SUPABASE_ANON_KEY,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  }
})

export type SupabaseConfig = ReturnType<typeof supabaseConfig>
