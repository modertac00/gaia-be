# Gaia BE — configurable ECS resources and deployment policy

This applies **only** to Gaia BE (`gaia-api`) in the shared Moderta ECS EC2
cluster. It does **not** resize an EC2 instance or change the VPC, ASG, EIP,
Traefik, database permissions, IAM roles, ingress, SQS, or application routes.

## How settings are resolved

1. Reviewed, version-controlled defaults: `config/resources/production.json`.
2. Optional overrides: GitHub Actions **production environment variables**.
3. Validation occurs before an ECS task definition/service is updated. The
   release checks host placement headroom before registering the API revision.

Only set an override when you intentionally want a value different from the
committed default. Absent or blank GitHub values use the committed defaults.

| GitHub `production` variable | Repository default | ECS use |
|---|---:|---|
| `ECS_CPU_UNITS` | `256` | API container CPU reservation |
| `ECS_MEMORY_RESERVATION` | `512` | API soft memory reservation (MiB) |
| `ECS_MEMORY_LIMIT` | `1024` | API hard memory limit (MiB) |
| `ECS_SCHEMA_CPU_UNITS` | `256` | One-off DB job CPU reservation |
| `ECS_SCHEMA_MEMORY_RESERVATION` | `256` | One-off DB job soft memory (MiB) |
| `ECS_SCHEMA_MEMORY_LIMIT` | `512` | One-off DB job memory limit (MiB) |
| `ECS_MIN_HEALTHY_PERCENT` | `100` | API rolling deployment minimum |
| `ECS_MAX_PERCENT` | `200` | API rolling deployment maximum |
| `ECS_AZ_REBALANCING` | `ENABLED` | ECS service AZ rebalancing |

**Recommended starting allocation for the new `t4g.xlarge`:** API 256 CPU,
512 MiB reservation, 1024 MiB limit. These settings are intentionally
conservative, not measurements of production usage. One-off DB task resources
stay separate so increasing the API does not accidentally double the migration
job's requirements. Every resource is enforced by the task definition built by
`deploy/common.py`, not only by the GitHub Actions display variables.

## Deployment modes

- **Start-first (default):** `ECS_MIN_HEALTHY_PERCENT=100`,
  `ECS_MAX_PERCENT=200`, `ECS_AZ_REBALANCING=ENABLED`. Before registering an
  API revision, Gaia preflight requires sufficient CPU and memory reservation
  on one connected container instance for an additional API task. If there is
  no room, the release stops rather than entering an ECS circuit-breaker loop.
- **Stop-first (planned downtime):** `ECS_MIN_HEALTHY_PERCENT=0`,
  `ECS_MAX_PERCENT=100`, `ECS_AZ_REBALANCING=DISABLED`. The existing Gaia
  API task may be terminated before a replacement is launched. This mode is
  useful if the host cannot fit two Gaia API tasks. Do not confuse this ECS
  service setting with the EC2 Auto Scaling Group instance refresh settings.

AZ rebalancing must be DISABLED when maxPercent is 100. For this single-task
service, minHealthy=100 and maxPercent below 200 is rejected because ECS
cannot start an additional task or terminate the old one. The migration task
has its own CPU/memory headroom check because it cannot borrow the running
API task's reservation before an independent migration begins.

These controls do not guarantee zero downtime or successful task placement if
other services change capacity after preflight. Continue to deploy the six
backends sequentially. Capacity planning also includes Traefik, Service
Connect, the ECS agent and EC2 host memory overhead.

## Safe rollout sequence

1. Verify the ASG **actually replaced** the old EC2 and the active ECS
   container instance registered 4096 CPU units; a new Launch Template alone
   does not resize the running host.
2. Set any overrides in **GitHub → gaia-be → Settings → Environments →
   production → Environment variables**, or leave unset to use the defaults.
3. Review CI and run `python3 -m unittest discover -s test/deploy -p 'test_*.py'`.
4. If Gaia's initial SQL tables were created without a `schema_migrations`
   ledger, use the separately approved snapshot-and-baseline workflow first.
   Do not drop Gaia tables or bypass checksum verification.
5. Run `02 · RELEASE / Gaia ECS (private, no route)` with confirmation `DEPLOY`.
   Migrations remain planned/verified through separate one-off ECS tasks.
6. Confirm a healthy Gaia ECS task and steady-state rollout. Review CloudWatch
   logs and CPU-credit balance for the burstable `t4g.xlarge`.

`03 · DB BASELINE`, `01B · DB Verify`, and `04 · RECOVERY` propagate the same
resource variables. Recovery intentionally retains its task-definition
identity checks and applies the configured deployment policy.

Changing any of these variables does nothing to ECS until the appropriate
protected GitHub workflow is deliberately run. Avoid changing the values
while another Gaia release or baseline operation is in progress.
