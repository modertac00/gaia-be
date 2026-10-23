---
name: sequelize-model-migration
description: Create or change gaia-be database schema with Sequelize — sequelize-typescript models, associations, umzug migrations with up/down, indexes and the matching repository methods. Use when the user asks to add a table/column/index/relation, change a column type, introduce a model, or migrate a legacy raw-SQL module to Sequelize.
---

# Sequelize model + migration

Rules: `.ai/instructions/database-rules.md`. Domain columns/values: `.ai/knowledge/domain-glossary.md`, `docs/gaia-db-plan.md`.

## 0. Runner check (first time only)

gaia-be's legacy runner (`scripts/migrate.ts`) replays every `migrations/*.sql` on each run with no tracking table. Before the first Sequelize migration:
1. Add `umzug` and `src/database/migrator.ts` from `templates/migrator.ts` (SequelizeMeta tracking).
2. Write a **baseline** migration that is a no-op for existing databases (the SQL files already created those tables) and creates them for fresh databases with `IF NOT EXISTS` semantics, or keep `scripts/migrate.ts` for legacy SQL and run umzug after it. Ask the user which; do not silently change `db:migrate`.
3. Point `npm run db:migrate` at the chosen flow.

## 1. Model

Start from `.claude/skills/nestjs-module/templates/models/feature.model.ts`.
- `allowNull` explicit on every column; domain value columns are TEXT validated with `isIn` against the contract `*_VALUES` list.
- FKs: `@ForeignKey(() => ParentModel)` + `@BelongsTo`, and `@HasMany` on the parent when the parent module needs it.
- JSONB columns typed with the contract type (`DataType.JSONB`).
- Register in the owning module's `SequelizeModule.forFeature`.

## 2. Migration

`templates/migration.ts` → `src/database/migrations/<YYYYMMDDHHmmss>-<kebab-description>.ts`.
- Mirror the model exactly (names snake_case in the DB).
- Do not add indexes; the team adds them manually. Note any suggested index in the spec or PR instead.
- `down` reverses `up` completely (drop columns, constraints).
- Destructive changes are separate, later migrations.

## 3. Repository

Add/adjust repository port + implementation methods for the new columns (see `nestjs-module` templates). Keep the model out of the service.

## 4. Verify

```bash
docker compose up -d postgres   # if not running
npm run db:migrate              # up
# run down then up again via the migrator CLI to prove reversibility
npm run lint && npm run build
```
Report actual output. Never run migrations against a non-local database.
