# Gaia GitHub OIDC: immutable repository identity and safe bootstrap repair

## Incident

`aws-actions/configure-aws-credentials@v4` repeatedly logs `Assuming role with OIDC` when AWS STS refuses role assumption. This is **not** an application database or SQS failure. Typical causes include a missing IAM bootstrap role, a stale role trust `sub`, wrong GitHub environment, missing `id-token: write`, missing OIDC provider, or a GitHub subject template mismatch. The repeated lines alone do not prove which of these is responsible. Read the final STS error.

## Identity contract

CDK constructs exact `StringEquals` conditions on GitHub issuer `aud=sts.amazonaws.com` and `sub`, separately for:

- `repo:OWNER@OWNER_ID/REPO@REPOSITORY_ID:environment:production-infrastructure`
- `repo:OWNER@OWNER_ID/REPO@REPOSITORY_ID:environment:production`

`OWNER_ID` and `REPOSITORY_ID` are queried with `gh api repos/OWNER/REPO`. The foundation workflow obtains them from `${{ github.repository_owner_id }}` and `${{ github.repository_id }}`. Never copy IDs from the AI Desk or Context Engine repositories. Do not relax trust to wildcard repositories or all environments.

**IMPORTANT:** Exact-match trust succeeds only if the actual GitHub-issued `sub` matches this format. This format follows the immutable-subject convention used by the team's AI Desk implementation. Depending on your GitHub organization OIDC settings, a custom subject template or a different default subject may be emitted. Check your repository/organization GitHub OIDC subject customization and the token's actual `sub` before changing the IAM condition. Do not change trust solely based on the repeated retry log lines.

## One-time local repair (does not require the broken OIDC role)

1. Ensure the Gaia repository has its **actual** GitHub remote, both GitHub environments, all nonsecret `production-infrastructure` deployment variables, and the existing `moderta-admin` AWS profile with permission to deploy the bootstrap stack.
2. From repository root: `AWS_PROFILE=moderta-admin bash infra/scripts/bootstrap-cdk.sh`. This fetches **current owner and repository IDs** from GitHub API; fetches missing nonsecret deployment variables from the `production-infrastructure` environment; validates the AWS account; shows the expected immutable subject; runs CDK tests and `cdk diff`. This is a dry-run.
3. Review the diff. Verify it updates the **existing** bootstrap IAM role's trust or creates that role only if it truly does not exist. Do not create a second identity.
4. Apply intentionally: `AWS_PROFILE=moderta-admin BOOTSTRAP_CONFIRM=BOOTSTRAP bash infra/scripts/bootstrap-cdk.sh`.
5. Confirm the bootstrapped role has `StringEquals` conditions for the exact `sub` and `aud`.
6. Rerun `01 · INFRA` in **diff** mode. The foundation stack will generate production application role trust using the repository IDs passed by the workflow.
7. After reviewing the foundation diff, deploy it to repair/create the application OIDC role. Then run DB verification.

If bootstrap IAM role lookup succeeds but GitHub authentication still fails, inspect the **actual token subject**, provider URL, role trust and final STS error. The role may also lack permissions for GitHub's actual job environment. A repository rename or owner transfer changes the name-bearing part of the immutable subject; rerun the bootstrap diff.

## IAM role ARN variables vs repository IDs

- `AWS_INFRA_ROLE_ARN` and `AWS_DEPLOY_ROLE_ARN` are **role references**, not the OIDC subject.
- `GAIA_GITHUB_OWNER_ID` and `GAIA_GITHUB_REPOSITORY_ID` are immutable GitHub identifiers used for IAM trust (not secrets).
- Database application and migration secret ARNs, GHCR secret ARN, AWS account/region, RDS endpoint and ECS cluster remain configurable through the existing deployment-target contract.
- Passwords, JWT signing values and GHCR tokens belong **only** in AWS Secrets Manager.

## Limitations

This repository alone cannot change the actual IAM trust policy merely by pushing code. Local AWS credentials must repair bootstrap trust before the protected infrastructure GitHub workflow can assume that role. This package is not an AWS-authenticated validation.
