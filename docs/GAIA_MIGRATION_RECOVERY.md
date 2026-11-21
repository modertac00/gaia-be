# Gaia production database migrations: durable fix and initial baseline reconciliation

## Why the second Gaia release stopped

Previous `scripts/migrate.ts` executed `001_auth.sql`, `002_init_data.sql` and `003_gaia_research_core.sql`, without writing migration history. The next `scripts/check-migrations.ts` correctly detected application tables and no `public.schema_migrations`, and stopped. **This is not a reason to reset production tables.**

## Durable behavior of the corrected code

- Planner and migrator both use `scripts/migration-utils.ts`: identical SQL ordering, SHA-256 over exact file bytes, immutable applied checksums, no unknown/out-of-order migrations, and no gaps.
- The planner is read-only and exits with `10` only if pending migrations exist; `0` if current; `1` on error. No ledger + existing application tables is an explicit error.
- Migrator uses `BEGIN`, a transaction-scoped PostgreSQL advisory lock, and a fresh ledger recheck. It creates the ledger only on a genuinely empty application schema, grants the `gaia_app` role read-only ledger access, applies only pending SQL, writes its filename/hash in the same transaction, and commits atomically. Errors roll back both SQL and ledger writes. A repeat deployment skips completed migrations.
- Existing migration files `001`-`003` are unchanged. New migrations must be appended as `004_*.sql`, etc. Never edit a recorded SQL migration. Only transaction-compatible migration SQL is supported (do not use `CREATE INDEX CONCURRENTLY`, `VACUUM`, etc. inside a migration).
- Application runtime IAM roles and networking remain unchanged. The migrator uses the existing dedicated `gaia_migrator` PostgreSQL role; the application uses `gaia_app`.

## Recover the historical initial migration state (preferred; does not drop user data)

This is ONE-TIME production recovery, and is deliberately separate from the normal `02 · RELEASE` workflow. It must not be used if the Gaia tables are known to be corrupt or only partially applied.

1. **Review current data and schema** using an authorized DBA account. Confirm database `gaia` contains the expected seven Gaia tables and all three SQL migrations actually finished; check columns, constraints, indexes, triggers, functions and existing user records. The baseline script checks structural invariants but **cannot prove arbitrary application data or every aspect of semantic equivalence**. Obtain approval from the database owner. Do not reset or seed production data.
2. Commit and push the fixed source to the Gaia release branch (e.g., `staging`). Review GitHub environment `production` protection. Ensure existing GHCR pull secret, Gaia runtime/migrator Secrets Manager secrets and existing ECS/RDS configuration remain correct.
3. Run the special workflow `03 · DB BASELINE / Gaia initial migration ledger (one-time)` using exact confirmation `RECONCILE_GAIA_BASELINE`. This runs image build/tests, ECS `baseline-check` as **read-only `gaia_app`**, creates and waits for a shared-RDS snapshot, then runs ECS `baseline` with `gaia_migrator`, and finally executes `plan` to check for zero pending migrations.
4. The baseline `apply` task verifies snapshot status, executes strict catalog verification again under an advisory lock, and creates only `public.schema_migrations` with three rows containing checked-in SHA-256 hashes. It grants `SELECT` on the ledger to `gaia_app`; **it does not execute 001-003 SQL again, drop tables or modify application data**. A preexisting ledger, unexpected objects, missing constraints/indexes or any failed check stops it without a ledger write.
5. Check CloudWatch log streams `schema/gaia-schema-job/*` for `GAIA_INITIAL_SCHEMA_VERIFIED` and `GAIA_BASELINE_LEDGER_RECORDED`. Snapshot identifiers are `gaia-before-migration-baseline-<UTC timestamp>` so they match the existing narrowly-scoped IAM permission `gaia-before-migration-*`. This snapshot covers the **entire shared RDS instance**; do not restore it in-place without coordinating the other production databases.
6. Run normal `02 · RELEASE / Gaia ECS (private, no route)` with confirmation `DEPLOY`. The migration planner should report `pending: 0, ledger: true`; the app rollout then starts the corrected `/ready` controller. Verify ECS `desiredCount=1`, `runningCount=1`, task `HEALTHY`, and no ECS deployment errors.

Example workflow invocations (only after database owner has reviewed the state):

```bash
REPO='modertac00/gaia-be'
gh workflow run reconcile-gaia-baseline.yml --repo "$REPO" --ref staging -f confirmation=RECONCILE_GAIA_BASELINE
# Inspect run logs; ensure baseline and plan completed before the next release.
gh workflow run deploy-production.yml --repo "$REPO" --ref staging -f confirmation=DEPLOY
```

## What if baseline verification rejects the existing schema?

**Stop. Do not bypass checks, fabricate ledger rows, or run `DROP SCHEMA` / `DROP TABLE` against production.** Investigate mismatched objects or partial DDL. An authorized DBA must decide whether to repair the partial migration, restore selective data to a new isolated instance, or perform a reviewed reset of a demonstrably disposable Gaia-only database. Existing Moderta RDS is shared with other services. Never reset the entire RDS instance as part of Gaia deployment.

For extra recovery assurance, take a **Gaia-only logical backup (`pg_dump`)** in a private environment, in addition to the shared-instance RDS snapshot. Snapshot restoration is not a per-database operation on a shared RDS instance.

## Verification / limitations

Run `npm ci --no-audit --no-fund && npm run build && npm run build:deploy && npm run test:migrations` plus `python3 -m unittest discover -s test/deploy -p 'test_*.py'`.

- Static and pure-functional tests are not a substitute for testing real PostgreSQL grants/transaction semantics in a disposable database with the same PostgreSQL major version as production.
- Baseline catalog checks verify expected initial objects, types, required defaults, constraints, indexes, triggers and function signatures/bodies at a basic level. They **cannot** prove all data-level invariants or every function/index definition. Approval requires DBA review beyond passing the automated check.
- Never auto-baseline an untracked database during a normal release. Never automatically reset production tables.
