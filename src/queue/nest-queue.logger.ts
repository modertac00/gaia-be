import type { QueueLogger } from '@moderta/api-contracts/queue'
import type { AppLogger } from '@/log'

const CONTEXT = 'MessageBus'

const withMeta = (message: string, meta?: Record<string, unknown>) => (meta ? `${message} ${JSON.stringify(meta)}` : message)

export function toQueueLogger(logger: AppLogger): QueueLogger {
  return {
    debug: (message, meta) => logger.debug(withMeta(message, meta), CONTEXT),
    info: (message, meta) => logger.log(withMeta(message, meta), CONTEXT),
    warn: (message, meta) => logger.warn(withMeta(message, meta), CONTEXT),
    error: (message, meta) => logger.error(withMeta(message, meta), undefined, CONTEXT),
  }
}
