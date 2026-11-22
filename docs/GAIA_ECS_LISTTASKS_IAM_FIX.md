# Gaia ECS ListTasks IAM scope fix — 2026-11-22

## Incident

`02 · RELEASE / Gaia ECS` deployed the Gaia application revision and passed its infrastructure and rollout-capacity checks. Its final `wait_healthy()` check stopped with `AccessDeniedException` on `ecs:ListTasks` for the GitHub OIDC app deployer role (`moderta-gaia-prod-app-deployer`). AWS reported a denied resource:

`arn:aws:ecs:ap-south-1:516900616370:container-instance/moderta-production-cluster/*`

The existing CDK foundation incorrectly scoped `ecs:ListTasks` to the ECS **cluster ARN**. AWS IAM's ECS Service Authorization Reference specifies **container-instance** as the required resource type for `ListTasks`. Cluster access must be enforced separately through `ecs:cluster`.

## Code fix

`infra/lib/foundation-stack.ts` now grants only:

- Action: `ecs:ListTasks`
- Resource: `arn:aws:ecs:${AWS_REGION}:${AWS_ACCOUNT_ID}:container-instance/${ECS_CLUSTER_NAME}/*`
- Condition: `ArnEquals` on `ecs:cluster = arn:aws:ecs:${AWS_REGION}:${AWS_ACCOUNT_ID}:cluster/${ECS_CLUSTER_NAME}`

This grants *read-only task discovery* within the existing production ECS cluster. It does **not** permit creation, deletion, stopping or updating other services. The `ecs:DescribeTasks` permission is already scoped to tasks in that cluster; it was not changed. ECS `ListTasks` necessarily sees task identifiers for the shared cluster; the release script narrows its query to the Gaia API service via `--service-name`.

The ECS task execution role, runtime role, database and migration policies, resource allocations, health endpoint and private network were not modified.

## Deployment order (important)

1. Commit and push the updated repository to the actual Gaia branch (`stg` in the prior run).
2. Run the existing **`01 · INFRA / Gaia-only CDK foundation`** workflow in `diff` mode. Confirm its change is limited to the app-deployer inline IAM policy.
3. Run that same workflow with `action=deploy` and `confirmation=FOUNDATION`. Wait for the CloudFormation stack to finish successfully; this updates the role in AWS. **Re-running the release first will fail with the same IAM denial.**
4. Read-only permission check using `aws iam simulate-principal-policy` (if the caller has permissions): `ecs:ListTasks` on the scoped container-instance resource, with `ecs:cluster` context. Otherwise use the production app role in the release workflow and confirm the ListTasks check is allowed.
5. Inspect ECS service and task health. The previous release's failed GitHub job does not prove the service is unhealthy: it may already be running on the new task definition. Do not run duplicate releases merely to clear the historical GitHub failure.
6. If another release is necessary, run **`02 · RELEASE / Gaia ECS`** only after the IAM policy deployment. The normal SQL migration planner should now skip already-recorded migrations.

**CLI workflow dispatch:**

```bash
REPO=modertac00/gaia-be
BRANCH=stg
gh workflow run infrastructure.yml -R "$REPO" --ref "$BRANCH" -f action=diff
gh workflow run infrastructure.yml -R "$REPO" --ref "$BRANCH" -f action=deploy -f confirmation=FOUNDATION
```

Verify the diff succeeds before running deploy, and ensure the selected Git ref contains the IAM fix.

**Operational note:** the app role does not own the IAM update. Only the restricted infrastructure role used by `production-infrastructure` can deploy the foundation policy change.
