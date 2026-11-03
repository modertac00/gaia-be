import { type BeforeApplicationShutdown, Global, Inject, Injectable, Module, type OnApplicationBootstrap } from '@nestjs/common'
import { type ConfigType } from '@nestjs/config'
import { MessageBus } from '@moderta/api-contracts/queue'
import { queueConfig } from '@/config'
import { AppLogger } from '@/log'
import { toQueueLogger } from '@/queue/nest-queue.logger'
import { MESSAGE_BUS } from '@/queue/queue.constants'

// A local queue (ElasticMQ, LocalStack) accepts any credentials. Real AWS uses the default credential chain.
const LOCAL_QUEUE_CREDENTIALS = { accessKeyId: 'local', secretAccessKey: 'local' }

function sqsDriverFor(config: ConfigType<typeof queueConfig>) {
  if (config.endpoint) {
    return { type: 'sqs' as const, region: config.region, endpoint: config.endpoint, credentials: LOCAL_QUEUE_CREDENTIALS }
  }
  return { type: 'sqs' as const, region: config.region }
}

@Injectable()
class QueueLifecycle implements OnApplicationBootstrap, BeforeApplicationShutdown {
  constructor(@Inject(MESSAGE_BUS) private readonly bus: MessageBus) { }

  async onApplicationBootstrap(): Promise<void> {
    await this.bus.start()
  }

  async beforeApplicationShutdown(): Promise<void> {
    await this.bus.stop()
  }

}

@Global()
@Module({
  providers: [
    {
      provide: MESSAGE_BUS,
      inject: [queueConfig.KEY, AppLogger],
      useFactory: (config: ConfigType<typeof queueConfig>, logger: AppLogger) =>
        MessageBus.init({
          driver: config.driver === 'sqs' ? sqsDriverFor(config) : { type: 'memory' },
          channels: config.channels,
          logger: toQueueLogger(logger),
        }),
    },
    QueueLifecycle,
  ],
  exports: [MESSAGE_BUS],
})
export class QueueModule { }
