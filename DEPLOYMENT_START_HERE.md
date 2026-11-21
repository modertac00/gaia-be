> **OIDC bootstrap prerequisite:** If `configure-aws-credentials` repeatedly retries on the infrastructure job, follow [docs/OIDC_IMMUTABLE_SUBJECT_AND_BOOTSTRAP.md](docs/OIDC_IMMUTABLE_SUBJECT_AND_BOOTSTRAP.md). The GitHub workflow cannot repair its own role trust.

> **Configuration update:** See [docs/FLEXIBLE_CONFIGURATION.md](docs/FLEXIBLE_CONFIGURATION.md) and [docs/GAIA_ECS_RESOURCE_CONFIGURATION.md](docs/GAIA_ECS_RESOURCE_CONFIGURATION.md). Infrastructure targets, task CPU/memory sizing, and ECS rollout policy are environment-configurable with reviewed defaults; no secret values are stored in the repository.

# Gaia Backend — Moderta production architecture parity, Phase 1

This package uses the same **CDK bootstrap/foundation**, immutable GHCR image, GitHub OIDC environments, private ECS EC2 bridge deployment, one-off DB role verification and migration tasks, pre-migration RDS snapshot, ECS circuit breaker and scoped recovery *pattern* as the supplied ESM Reporting, Mint AI Desk and Context Engine deployments.

**Scope:** Gaia backend ONLY. `gaia` database and both DB roles already exist. No Traefik route or domain. No Gaia↔AI or SQS traffic. Never modify the existing cluster/ASG/EIP/RDS/network/gateway.

## First-time preparation
1. An authorized administrator confirms `gaia` DB, `gaia_app`, `gaia_migrator`, `pgcrypto`, correct schema grants and the four existing Gaia / Gaia-AI DB password secrets. The Gaia jobs use only the two Gaia DB secrets.
2. Create `moderta/production/gaia/jwt-secret` (if missing) as a Secrets Manager *SecretString*. Confirm existing `GHCR_SECRET_ARN` is appropriate for ECS `repositoryCredentials`.
3. Confirm GitHub repo OIDC owner/repo numeric IDs and immutable subject format with your existing issuer, and bootstrap the **Gaia-only** infrastructure IAM role using `infra/bin/gaia.ts` in `GAIA_STACK_SELECTION=bootstrap` with an approved admin identity. Bootstrap stack is a one-time admin action and isn't run automatically from GitHub.
4. GitHub environments: `production-infrastructure` needs `AWS_INFRA_ROLE_ARN`, `GHCR_SECRET_ARN`; `production` needs `AWS_DEPLOY_ROLE_ARN`, `GHCR_SECRET_ARN`. Both require protection approvals. The infra role and app deploy role are DIFFERENT.
5. Verify the existing RDS SG ID `sg-0e990b563689840cd`, ECS host SG `sg-0367a986b43e00f5a`, and current **actual** ECS host CPU/memory capacity match AWS conditions. Launch Template settings alone do not resize a running EC2 instance; verify the ASG instance refresh completed. These are assertions, not a request to change network resources.

## Workflows
- **01 · INFRA** `infrastructure.yml` default diff; explicit FOUNDATION to deploy Gaia CDK foundation. Never provisions shared cluster or gateway.
- **01B · DB** `verify-gaia-db.yml` connects via private ECS jobs with both EXISTING users, no DB provisioning.
- **02 · RELEASE** `deploy-production.yml` single ARM64 image digest, database preflight, migration plan, conditional RDS snapshot, one-off migration, post-check and ECS service deployment, no route.
- **04 · RECOVERY** `recovery-gaia.yml` restores approved Gaia task revision only. Note: rolling back application revision **does not roll back database migrations**.
- **PR** `pr-check.yml` compile/validate deployment and CDK.

## Required DB owner action before first migrate
- `pgcrypto` must be installed by an authorized DBA in `gaia` (the migration no longer attempts to install it with restricted migrator).
- Existing tables with no `schema_migrations` are refused; reconcile before using the migrator.
- Before migrations, ensure the authorized DBA applies the **default-privilege** statements from `infra/database/001-runtime-grants.sql` as the correct schema-owner role (so newly-created tables are accessible to `gaia_app`). After migrations, apply grants on existing tables as needed. The release post-check FAILS closed if app lacks DML.
- No automatic seeding/account creation. Optional one-time seed is handled as a separate controlled private task after explicit review.

## What Phase 1 success means
ECS image running, `/health` and real DB `/ready` probe healthy internally, GitHub/CloudWatch deployment verified. Gaia's application business paths that currently mark research as queued do NOT enqueue SQS messages. Do not claim successful research processing.

## Deferred
See `docs/PHASE2_INTEGRATION_BACKLOG.md`. No mocked success responses are inserted in public business endpoints; no undeclared event payloads or fake S3 persistence.
