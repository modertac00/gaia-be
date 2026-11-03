import { Sequelize } from 'sequelize'
import { SequelizeStorage, Umzug } from 'umzug'
import { databaseConfig } from '@/config'

export function createMigrationSequelize(): Sequelize {
  const db = databaseConfig()

  return new Sequelize({
    dialect: db.dialect,
    host: db.host,
    port: db.port,
    username: db.username,
    password: db.password,
    database: db.database,
    logging: false,
  })
}

export function createMigrator(sequelize: Sequelize) {
  const queryInterface = sequelize.getQueryInterface()

  return new Umzug({
    migrations: { glob: ['migrations/*.ts', { cwd: __dirname, ignore: ['**/*.d.ts'] }] },
    context: queryInterface,
    storage: new SequelizeStorage({ sequelize, tableName: 'sequelize_meta' }),
    logger: console,
  })
}
