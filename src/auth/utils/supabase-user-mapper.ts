import type { User } from '@supabase/supabase-js'
import type { AuthIdentity } from '@moderta/api-contracts/gaia'

export function readAuthMethods(accessToken: string): string[] {
  try {
    const payload = JSON.parse(Buffer.from(accessToken.split('.')[1] ?? '', 'base64url').toString('utf8')) as {
      amr?: unknown
    }
    if (!Array.isArray(payload.amr)) return []
    return payload.amr.flatMap((entry: unknown) => {
      if (typeof entry === 'string') return [entry]
      const method = (entry as { method?: unknown } | null)?.method
      return typeof method === 'string' ? [method] : []
    })
  } catch {
    return []
  }
}

export function toAuthIdentity(user: User, authMethods: string[] = []): AuthIdentity {
  const email = user.email ?? ''
  const name = readString(user.user_metadata, 'full_name') ?? email.split('@')[0]
  return { id: user.id, email, name, appMetadata: user.app_metadata ?? {}, authMethods }
}

function readString(source: Record<string, unknown> | undefined, key: string): string | null {
  const value = source?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

