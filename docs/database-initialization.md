# Database provisioning and initialization

Databases and roles are **already created**; no automated bootstrap grants or password rotations. Verify with actual SQL, not only Secrets Manager metadata. RDS `pgcrypto` must exist in the `gaia` database before `001_auth.sql`. An authorized admin can run `CREATE EXTENSION IF NOT EXISTS pgcrypto;` in gaia after checking support and existing privileges.

Migration files are original SQL; the migration ledger is new. For prepopulated databases never stamp history without inspecting objects. Apply migrations using digest-pinned one-off ECS task with DB_MIGRATOR password only.

The app runtime gets DB_APP password plus JWT only. The init-data seed is separate and opt-in, non-overwriting (ON CONFLICT DO NOTHING). Trigger `TASK_VARIANT=seed` with the migration image digest if the initial research library entry is required; run one-off ECS task and check exit status. Do not seed on container restarts.

After migration, run the 01B DB verification again to confirm app DML grants. If app checks fail, fix grants as database admin and rerun. Do not run app with migrator credentials.
