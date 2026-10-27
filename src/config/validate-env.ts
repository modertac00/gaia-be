import { type Env, envSchema } from './env.schema'

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw)

  if (!result.success) {
    const lines = result.error.issues.map((issue) => `  - ${issue.path.join('.') || 'env'}: ${issue.message}`)
    throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`)
  }

  return result.data
}
