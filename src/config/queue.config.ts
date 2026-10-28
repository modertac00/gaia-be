import { registerAs } from '@nestjs/config'
import { AI_QUEUE_CHANNEL } from '@moderta/api-contracts/gaia'
import { validateEnv } from './validate-env'

export const QUEUE_CONFIG_KEY = 'queue'

const MEMORY_DESTINATIONS = { tasks: 'memory://ai-tasks', status: 'memory://ai-status' } as const

export const queueConfig = registerAs(QUEUE_CONFIG_KEY, () => {
  const env = validateEnv(process.env)
  const isMemory = env.QUEUE_DRIVER === 'memory'

  return {
    driver: env.QUEUE_DRIVER,
    region: env.AWS_REGION,
    endpoint: env.QUEUE_ENDPOINT,
    consumersEnabled: env.QUEUE_CONSUMERS_ENABLED,
    channels: {
      [AI_QUEUE_CHANNEL.TASKS]: { destination: isMemory ? MEMORY_DESTINATIONS.tasks : (env.AI_TASK_QUEUE_URL as string) },
      [AI_QUEUE_CHANNEL.STATUS]: { destination: isMemory ? MEMORY_DESTINATIONS.status : (env.AI_STATUS_QUEUE_URL as string) },
    },
  }
})

export type QueueConfig = ReturnType<typeof queueConfig>
