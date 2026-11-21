# Gaia ECS readiness probe — production hotfix

## Diagnosis

The ECS health check in `deploy/common.py` requests `GET http://127.0.0.1:3001/ready`, but `src/app.module.ts` registered only `HealthController`. Although `src/ready.controller.ts` existed and implemented `GET /ready`, NestJS never registered the controller, causing all Gaia application tasks to fail their container health checks. ECS reported `Task failed container health checks`, with exit 137 after stopping unhealthy containers. The exit code alone is not proof of an OOM.

## Minimal correction

- Import `ReadyController` into `src/app.module.ts`.
- Include `ReadyController` in `controllers: [HealthController, ReadyController]`.
- Keep the existing DB-backed `/ready` check (`SELECT 1`), `/health`, port 3001, and ECS task-definition health-check command unchanged.
- Add `test/deploy/test_health_route.py` to reject recurrence in CI.

No routing, SQS, RDS schema, IAM, GitHub OIDC, ECS cluster/network architecture, or other Gaia business modules are changed.

## Validation

`python3 -m unittest discover -s test/deploy -p 'test_*.py'` checks the app module registration, controller path, actual database query, port and ECS health-check contract.

`npm ci --no-audit --no-fund && npm run build && npm run build:deploy` must also pass locally or in GitHub Actions before release. This environment may not have all npm dependencies cached.

## Rollout

1. Apply these files to the actual `modertac00/gaia-be` deployment branch, review diff, commit, and push.
2. Run the existing `02 · RELEASE / Gaia ECS` workflow with its current `DEPLOY` approval. It rebuilds the image by digest and registers a new task-definition revision.
3. The existing database schema is already migrated; the migration ledger check should return current. The pipeline should **not** blindly recreate or reseed the database.
4. Verify `desiredCount=1`, `runningCount=1`, ECS `HEALTHY`, and steady state.
5. If the new rollout still fails, inspect `GET /ready` response, PostgreSQL authorization, environment variables, and ECS events. Do not bypass readiness by replacing it with `/health`.

### Useful commands

```bash
aws ecs describe-services --cluster moderta-production-cluster \
  --services moderta-production-gaia-api --region ap-south-1 --profile moderta-admin \
  --query 'services[0].{Desired:desiredCount,Running:runningCount,Pending:pendingCount,Events:events[:5].[createdAt,message]}' --output json

aws logs tail /ecs/moderta/production/gaia-api --since 20m \
  --region ap-south-1 --profile moderta-admin
```
