import { Logger, Module } from '@nestjs/common'
import { type ConfigType } from '@nestjs/config'
import { SequelizeModule } from '@nestjs/sequelize'
import { appConfig, databaseConfig } from '@/config'

const logger = new Logger('Sequelize')

@Module({
  imports: [
    SequelizeModule.forRootAsync({
      inject: [databaseConfig.KEY, appConfig.KEY],
      useFactory: (db: ConfigType<typeof databaseConfig>, app: ConfigType<typeof appConfig>) => ({
        dialect: db.dialect,
        host: db.host,
        port: db.port,
        username: db.username,
        password: db.password,
        database: db.database,
        autoLoadModels: true,
        synchronize: true, // for development only, use migrations for production
        logging: app.isDevelopment ? (sql: string) => logger.debug(sql) : false,
      }),
    }),
  ],
})
export class DatabaseModule { }
