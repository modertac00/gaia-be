#!/usr/bin/env bash
set -euo pipefail
REPO="${REPO:-$(gh repo view --json nameWithOwner --jq '.nameWithOwner')}"
: "${REPO:?Set REPO}"
# Export all required vars in your shell (e.g. source a PRIVATE .env file not committed to git).
while IFS= read -r name; do
  : "${!name:?Export $name before running this script}"
done < <(python3 - <<'PYTHON'
import json,re
raw=json.load(open('config/deployment-targets/production.json'))
for v in raw.values():
 if isinstance(v,str) and re.fullmatch(r'\$\{[A-Z][A-Z0-9_]*\}',v): print(v[2:-1])
PYTHON
)
for envname in production-infrastructure production; do
 while IFS= read -r name; do
   value="${!name:-}"
   if [ -z "$value" ]; then echo "Missing local variable: $name" >&2; exit 1; fi
   gh variable set "$name" --repo "$REPO" --env "$envname" --body "$value"
 done < <(python3 - <<'PYTHON'
import json,re
raw=json.load(open('config/deployment-targets/production.json'))
for v in raw.values():
 if isinstance(v,str) and re.fullmatch(r'\$\{[A-Z][A-Z0-9_]*\}',v): print(v[2:-1])
PYTHON
)
done
echo 'Deployment configuration published to protected GitHub environments (no secret values).'
