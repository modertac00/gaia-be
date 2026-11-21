# Reference comparison and deviations

| Component | Reporting / AI Desk / Context reference | Gaia Phase 1 |
|---|---|---|
| `infra/bin`, `infra/lib/bootstrap-stack.ts`, `foundation-stack.ts`, `cdk.json` | CDK | Same structure, Gaia-scoped resources |
| OIDC | Protected infrastructure and production environments, immutable numeric owner/repo subject | Same convention; values must be checked against GitHub issuer behavior |
| `config/deployment-targets/production.json` | Exact target contract, SG/RDS names | Same contract, Gaia values |
| `deploy/preflight.py` | Shared ECS/RDS SG/capacity read-only | Gaia read-only checks |
| DB verification | One-off private ECS task, runtime/migrator role | Same, using Gaia PG SQL scripts |
| Migrations | Schema plan, pre-snapshot, one-off ECS, postchecks | Same release sequence; Gaia's native SQL runner |
| Build | ARM64 GHCR digest from one build | Same |
| Release | Single-service EC2/bridge, circuit breaker, health | Same, private hostPort=0 |
| Recovery | Only service task revision | Same |
| Routing | Separate opt-in route workflow | Deliberately DISABLED: no Gaia domain |
| Optional SQS/S3 research integration | Application specific | Deliberately deferred; NOT mock-completed |
| Database bootstrap | Manual DB/roles/secrets | Reuse already-created Gaia identities |

This is a close functional port of the reference delivery **pattern**, not a byte-for-byte reuse of all reference helper logic. Run CDK diff and AWS verification before first deployment.
