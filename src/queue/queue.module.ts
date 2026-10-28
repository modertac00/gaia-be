import { type BeforeApplicationShutdown, Global, Inject, Injectable, Module, type OnApplicationBootstrap } from '@nestjs/common'
import { type ConfigType } from '@nestjs/config'
import { MessageBus } from '@moderta/api-contracts/queue'
import { queueConfig } from '@/config'
import { AppLogger } from '@/log'
import { toQueueLogger } from '@/queue/nest-queue.logger'
import { MESSAGE_BUS } from '@/queue/queue.constants'

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
          driver:
            config.driver === 'sqs'
              ? { type: 'sqs', region: config.region, endpoint: config.endpoint }
              : { type: 'memory' },
          channels: config.channels,
          logger: toQueueLogger(logger),
        }),
    },
    QueueLifecycle,
  ],
  exports: [MESSAGE_BUS],
})
export class QueueModule { }
