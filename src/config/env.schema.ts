import { z } from 'zod'

export const DB_TYPES = ['postgres'] as const

const DEV_FRONTEND_URL = 'http://localhost:5173'

export const envSchema = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
    SUPABASE_URL: z.url(),
    SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    DB_TYPE: z.enum(DB_TYPES).default('postgres'),
    DB_HOST: z.string().min(1),
    DB_PORT: z.coerce.number().int().min(1).max(65535),
    DB_USERNAME: z.string().min(1),
    DB_PASSWORD: z.string().min(1),
    DB_NAME: z.string().min(1),
    FRONTEND_URL: z.url().optional(),
    ADMIN_EMAIL: z.string().optional(),
    ADMIN_PASSWORD: z.string().optional(),
    ADMIN_NAME: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && !env.FRONTEND_URL) {
      ctx.addIssue({ code: 'custom', path: ['FRONTEND_URL'], message: 'Required when NODE_ENV=production' })
    }
  })
  .transform((env) => ({ ...env, FRONTEND_URL: env.FRONTEND_URL ?? DEV_FRONTEND_URL }))

export type Env = z.infer<typeof envSchema>
