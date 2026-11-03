import { createMigrationSequelize, createMigrator } from '../src/database/migrator'

// Umzug's own CLI: `up`, `down` (reverts the last migration; `--to 0` reverts all), `pending`, `executed`, `create`.
async function main() {
  const sequelize = createMigrationSequelize()

  try {
    const ok = await createMigrator(sequelize).runAsCLI()
    if (!ok) process.exitCode = 1
  } finally {
    await sequelize.close()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
