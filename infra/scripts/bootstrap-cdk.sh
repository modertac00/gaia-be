#!/usr/bin/env bash
# One-time local IAM bootstrap (and idempotent trust repair). Never depends on GitHub OIDC to repair OIDC.
set -euo pipefail
cd "$(dirname "$0")/../.."
command -v gh >/dev/null || { echo 'GitHub CLI (gh) required' >&2; exit 1; }
command -v aws >/dev/null || { echo 'AWS CLI required' >&2; exit 1; }
command -v jq >/dev/null || { echo 'jq required' >&2; exit 1; }
command -v npm >/dev/null || { echo 'npm required' >&2; exit 1; }
REPO="${GAIA_GITHUB_REPOSITORY:-$(gh repo view --json nameWithOwner --jq '.nameWithOwner')}"
REPO_JSON="$(gh api "repos/$REPO")"
export GAIA_GITHUB_REPOSITORY="$(jq -r '.full_name' <<<"$REPO_JSON")"
export GAIA_GITHUB_OWNER_ID="$(jq -r '.owner.id' <<<"$REPO_JSON")"
export GAIA_GITHUB_REPOSITORY_ID="$(jq -r '.id' <<<"$REPO_JSON")"
# The protected GitHub environment is the source of non-sensitive deployment values.
GITHUB_ENVIRONMENT="${GITHUB_ENVIRONMENT:-production-infrastructure}"
VARIABLES="$(gh variable list --repo "$REPO" --env "$GITHUB_ENVIRONMENT" --json name,value)"
while IFS= read -r key; do
  if [[ -z "${!key:-}" ]]; then
    value="$(jq -r --arg name "$key" '[.[] | select(.name == $name) | .value] | first // empty' <<<"$VARIABLES")"
    [[ -n "$value" ]] || { echo "Missing $key in environment $GITHUB_ENVIRONMENT" >&2; exit 1; }
    printf -v "$key" '%s' "$value"
    export "$key"
  fi
done < <(python3 - <<'PY'
import json,re
with open('config/deployment-targets/production.json') as f: config=json.load(f)
for v in config.values():
    if isinstance(v,str) and re.fullmatch(r'\$\{[A-Z][A-Z0-9_]*\}',v): print(v[2:-1])
PY
)
export GAIA_STACK_SELECTION=bootstrap
export AWS_PROFILE="${AWS_PROFILE:-moderta-admin}"
REAL_ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
[[ "$REAL_ACCOUNT" == "$AWS_ACCOUNT_ID" ]] || { echo "Account mismatch: configured $AWS_ACCOUNT_ID, authenticated $REAL_ACCOUNT" >&2; exit 1; }
EXPECTED_SUB="repo:${GAIA_GITHUB_REPOSITORY%%/*}@${GAIA_GITHUB_OWNER_ID}/${GAIA_GITHUB_REPOSITORY#*/}@${GAIA_GITHUB_REPOSITORY_ID}:environment:production-infrastructure"
ROLE_NAME="${INFRA_ROLE_NAME:?INFRA_ROLE_NAME required}"
echo "Repository: $GAIA_GITHUB_REPOSITORY (owner ID $GAIA_GITHUB_OWNER_ID, repo ID $GAIA_GITHUB_REPOSITORY_ID)"
echo "Expected infrastructure OIDC subject: $EXPECTED_SUB"
if aws iam get-role --role-name "$ROLE_NAME" --query Role.Arn --output text >/dev/null 2>&1; then
  echo "Existing IAM role $ROLE_NAME found. CDK diff will show whether its trust needs updating."
else
  echo "IAM role $ROLE_NAME does not exist. CDK bootstrap will create it after confirmation."
fi
(cd infra && npm ci --no-audit --no-fund && npm test && npx cdk diff ModertaGaiaBootstrapStack --no-change-set)
if [[ "${BOOTSTRAP_CONFIRM:-}" != BOOTSTRAP ]]; then
  echo 'Diff only. After reviewing, run: BOOTSTRAP_CONFIRM=BOOTSTRAP bash infra/scripts/bootstrap-cdk.sh'
  exit 0
fi
(cd infra && npx cdk deploy ModertaGaiaBootstrapStack --require-approval never)
aws iam get-role --role-name "$ROLE_NAME" --query 'Role.AssumeRolePolicyDocument.Statement' --output json | jq -e --arg sub "$EXPECTED_SUB" '[.[] | select(.Effect == "Allow") | .Condition.StringEquals["token.actions.githubusercontent.com:sub"]] | any(. == $sub)' >/dev/null || {
  echo 'Deployed trust policy does not contain expected immutable sub. STOP.' >&2; exit 1;
}
echo 'IAM role trust contains the exact expected immutable subject.'
echo 'Next: run 01 · INFRA workflow in diff mode, after verifying actual token subject if assumption still fails.'
