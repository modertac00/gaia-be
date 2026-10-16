// src/config/env.config.ts — the only place that reads process.env.
import { z } from 'zod'

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('1d'),
})

export type Env = z.infer<typeof envSchema>

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config)
  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join('.')).join(', ')
    throw new Error(`Invalid environment configuration: ${fields}`) // names only, never values
  }
  return result.data
}

// AppModule: ConfigModule.forRoot({ isGlobal: true, validate: validateEnv })
// Inject: constructor(private readonly config: ConfigService<Env, true>) {}
//         this.config.get('PORT', { infer: true })
