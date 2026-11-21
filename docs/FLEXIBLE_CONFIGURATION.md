# Gaia production deployment configuration — no hardcoded infrastructure IDs

The authoritative **schema** is `config/deployment-targets/production.json`. Its values are `${VARIABLE}` references, resolved at runtime. Identifiers and exact Secrets Manager ARNs are supplied by GitHub environment variables in BOTH protected environments, or exported locally for `cdk diff`/bootstrap. No password/token values belong in GitHub variables or this repository.

- `DB_APP_PASSWORD_SECRET_ARN`: ARN of the existing Gaia application-password secret.
- `DB_MIGRATION_PASSWORD_SECRET_ARN`: ARN of the existing Gaia migrator-password secret.
- `JWT_SECRET_ARN`: ARN of Gaia JWT signing secret (must exist before deployment).
- `GHCR_SECRET_ARN`: shared existing GHCR pull credential secret ARN.
- `AWS_ACCOUNT_ID`, `AWS_REGION`, `ECS_CLUSTER_NAME`, `ECS_SERVICE_NAME`, `ECS_TASK_FAMILY`, `ECS_SCHEMA_FAMILY`, `ECS_CONTAINER_NAME`, `DB_NAME`, `DB_APP_USER`, `DB_MIGRATOR_USER`, `RDS_INSTANCE_IDENTIFIER`, `DB_HOST`, `RDS_SECURITY_GROUP_ID`, `ECS_HOST_SECURITY_GROUP_ID`, `INFRA_ROLE_NAME`, `APP_DEPLOY_ROLE_NAME`, `ECS_EXECUTION_ROLE_NAME`, `ECS_TASK_ROLE_NAME`, `CLOUDWATCH_LOG_GROUP`, `CLOUDWATCH_ALARM_PREFIX`: environment-owned deployment identifiers.

Identity separation continues unchanged. ECS execution role is the only role with `secretsmanager:GetSecretValue` for approved task secrets. Migrator secret is injected only into schema-task mode. No DB passwords are read into the GitHub runner.

## Configure
Create protected GitHub environments `production-infrastructure` and `production`. In a local untracked file (outside the repository) export the above values, then run `bash infra/scripts/set-github-variables.sh`. Retain existing `AWS_INFRA_ROLE_ARN` and `AWS_DEPLOY_ROLE_ARN` variables. `aws-actions/configure-aws-credentials` obtains temporary credentials via OIDC.

For local bootstrap/CDK operations, export the same vars along with `GAIA_GITHUB_REPOSITORY`, `GAIA_GITHUB_OWNER_ID`, `GAIA_GITHUB_REPOSITORY_ID`, `GAIA_STACK_SELECTION`. Always run `npx cdk diff` and review IAM changes before `deploy`.

## Controls
- The deployment refuses missing config vars, mismatched account/region on Secrets Manager ARNs, unexpected AWS caller account, or enabled public ingress/SQS app integration.
- Existing database/users are never created by GitHub workflows.
- Traefik remains disabled pending a separately approved routing change.
- No mock or fake API results are introduced.
