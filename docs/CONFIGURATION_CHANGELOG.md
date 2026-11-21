# Phase 1 — Removal of hardcoded deployment identifiers

This revision starts from the uploaded `gaia-be-stg (1).zip` and retains the Moderta CDK bootstrap/foundation, GitHub OIDC, private ECS EC2 bridge service, one-off database verification/migrations, snapshot and recovery architecture.

## Removed from executable deployment source

- Fixed AWS account and region values.
- Fixed ECS cluster, service, schema family and container identifiers.
- Fixed PostgreSQL host/instance/security-group identifiers and role names.
- Fixed IAM role names, CloudWatch log group and alarm prefix.
- Implicit Secrets Manager prefix/name lookups for app/migrator password and JWT; explicit exact ARNs are now injected.
- Fixed account/region checks against previous literal values. Runtime checks compare AWS caller/ARNs against the supplied contract.

## Configuration contract

- `config/deployment-targets/production.json` has no concrete AWS identifiers: entries are `${GITHUB_VARIABLE}` placeholders.
- `infra/lib/config.ts` and `deploy/common.py` resolve the same required environment contract.
- GitHub Actions `production-infrastructure` and `production` jobs expose environment-scoped variables to CDK/Python. `checks` and `build` jobs do not require AWS configuration.
- Existing OIDC role variables `AWS_INFRA_ROLE_ARN` and `AWS_DEPLOY_ROLE_ARN` are unchanged.
- Secret values are never pulled by runner; ECS injects secret values using exact approved secret ARNs.

## Unchanged rollout behavior

No public Traefik route or SQS application integration. No new cluster, VPC, RDS instance or database users. Gaia migrator password only in one-off schema tasks; Gaia app password in API runtime. Use CDK diff before deploy.

## Validation

Python deployment scripts compile, contract tests pass, GitHub workflow YAML parses and the infrastructure static test passes. CDK build was not completed in this environment because the npm dependencies were unavailable offline. This package is a deployment candidate; run `npm ci && npm test` in `infra/` and review `cdk diff` before production action.
