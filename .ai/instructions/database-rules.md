# Database rules (Sequelize + PostgreSQL)

Target ORM is **Sequelize** via `@nestjs/sequelize` + `sequelize-typescript`. Existing hand-written SQL (`migrations/*.sql`, services using `DATABASE_POOL`) is legacy: do not extend it; migrate a module to Sequelize when you substantially change it.

## Models

- One model per table in `src/modules/<feature>/models/<entity>.model.ts`, class `<Entity>Model`.
- `@Table({ tableName: 'research_requests', underscored: true, timestamps: true })`; attributes are camelCase in TS, snake_case in DB.
- Primary keys: UUID (`DataType.UUID`, `defaultValue: DataType.UUIDV4`) unless the table already uses something else.
- Declare `allowNull` explicitly on every column. Domain value columns are `TEXT` + `validate: { isIn: [RESEARCH_STATUS_VALUES] }` (values from the contract list, never retyped) and a DB `CHECK` constraint in the migration; avoid PG ENUM types (hard to evolve).
- Archival: prefer an explicit `status`/`archivedAt` when the domain has an "archived" state the user sees; use `paranoid: true` only for pure soft-delete.
- Associations live in the model (`@BelongsTo`, `@HasMany`) and match FK constraints in the migration.
- Models are registered with `SequelizeModule.forFeature([...])` in their own module only.

## Migrations

- Every schema change is a migration. Never use `sequelize.sync()` outside tests.
- Location `src/database/migrations/<YYYYMMDDHHmmss>-<kebab-description>.ts` (umzug) — or the runner already configured in the repo; check before adding a second runner.
- Each migration has `up` and a working `down`. Additive changes first; destructive changes (drop/rename) in a separate, later migration after code no longer uses the column.
- Add indexes for every FK and every column used in list filters/sorting (e.g. `(owner_id, created_at)` for cursor pagination).
- Never edit a migration that has run in a shared environment; write a new one.

## Queries (repositories only)

- Only `sequelize-*.repository.ts` files import models, `Op`, `Sequelize` or `Transaction`.
- Every query on user-owned data includes the ownership predicate (`ownerId: user.id`, or join through the owning parent). See `security-rules.md`.
- Select only needed attributes for list endpoints; avoid N+1 with `include` or batched queries.
- Raw SQL (`sequelize.query`) only when the ORM cannot express it; use replacements/bind params, never string interpolation.
- Cursor pagination: order by `(created_at DESC, id DESC)`, fetch `limit + 1`, return `nextCursor` from the last item.

## Transactions

- The **service** owns the transaction boundary for multi-write use cases: `this.sequelize.transaction(async (transaction) => { ... })` via an injected `TransactionRunner` port (keeps services free of Sequelize imports).
- Repository methods accept an optional `{ transaction?: Transaction }` option and pass it to every query.

## Seeds

- Seeds are idempotent scripts in `scripts/` or umzug seeders; no secrets or real customer data in seed files.
