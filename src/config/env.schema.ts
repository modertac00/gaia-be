import { z } from 'zod'

export const DB_TYPES = ['postgres'] as const
export const QUEUE_DRIVERS = ['sqs', 'memory'] as const

const DEV_FRONTEND_URL = 'http://localhost:5173'

/** `KEY=` in a copied .env.example means "not set", not an invalid empty value. */
const blankAsUnset = <T extends z.ZodType>(schema: T) => z.preprocess((value) => (value === '' ? undefined : value), schema.optional())

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
    QUEUE_DRIVER: z.enum(QUEUE_DRIVERS).optional(),
    AWS_REGION: blankAsUnset(z.string().min(1)),
    QUEUE_ENDPOINT: blankAsUnset(z.url()),
    AI_TASK_QUEUE_URL: blankAsUnset(z.url()),
    AI_STATUS_QUEUE_URL: blankAsUnset(z.url()),
    QUEUE_CONSUMERS_ENABLED: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),
    ADMIN_EMAIL: z.string().optional(),
    ADMIN_PASSWORD: z.string().optional(),
    ADMIN_NAME: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && !env.FRONTEND_URL) {
      ctx.addIssue({ code: 'custom', path: ['FRONTEND_URL'], message: 'Required when NODE_ENV=production' })
    }
    if (env.NODE_ENV === 'production' && !env.QUEUE_DRIVER) {
      ctx.addIssue({ code: 'custom', path: ['QUEUE_DRIVER'], message: 'Required when NODE_ENV=production' })
    }
    if (env.NODE_ENV === 'production' && env.QUEUE_DRIVER === 'memory') {
      ctx.addIssue({ code: 'custom', path: ['QUEUE_DRIVER'], message: 'The in-process queue is for development; use sqs when NODE_ENV=production' })
    }
    if (env.QUEUE_DRIVER === 'sqs') {
      for (const key of ['AWS_REGION', 'AI_TASK_QUEUE_URL', 'AI_STATUS_QUEUE_URL'] as const) {
        if (!env[key]) ctx.addIssue({ code: 'custom', path: [key], message: 'Required when QUEUE_DRIVER=sqs' })
      }
    }
  })
  .transform((env) => ({
    ...env,
    FRONTEND_URL: env.FRONTEND_URL ?? DEV_FRONTEND_URL,
    QUEUE_DRIVER: env.QUEUE_DRIVER ?? ('memory' as const),
  }))

export type Env = z.infer<typeof envSchema>
