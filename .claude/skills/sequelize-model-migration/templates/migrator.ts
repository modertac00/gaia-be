// src/database/migrator.ts — umzug runner with SequelizeMeta tracking.
// Run: ts-node -r tsconfig-paths/register src/database/migrator.ts up|down|pending
import { Sequelize } from 'sequelize'
import { SequelizeStorage, Umzug } from 'umzug'
import { validateEnv } from '../config/env.config'

const env = validateEnv(process.env)
const sequelize = new Sequelize(env.DATABASE_URL, { dialect: 'postgres', logging: false })

export const migrator = new Umzug({
  migrations: { glob: ['migrations/*.{ts,js}', { cwd: __dirname }] },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
})

export type Migration = typeof migrator._types.migration

if (require.main === module) {
  void migrator.runAsCLI().finally(() => sequelize.close())
}
