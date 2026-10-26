import { Inject, Injectable } from '@nestjs/common'
import { type ConfigType } from '@nestjs/config'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { supabaseConfig } from '../config'


@Injectable()
export class SupabaseService {
  constructor(@Inject(supabaseConfig.KEY) private readonly config: ConfigType<typeof supabaseConfig>) { }

  getPublicClient(): SupabaseClient {
    return this.createStatelessClient(this.config.anonKey)
  }

  getAdminClient(): SupabaseClient {
    return this.createStatelessClient(this.config.serviceRoleKey)
  }

  private createStatelessClient(key: string): SupabaseClient {
    return createClient(this.config.url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  }
}
