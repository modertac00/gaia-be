---
description: Run gaia-be quality gates (lint, build, tests) and report real results
---

Run the gaia-be gates in order:

1. `npm run lint`
2. `npm run build`
3. `npm test` — only if the script exists in `package.json`
4. `npm run test:e2e` — only if the script exists and Postgres is reachable (`docker compose ps`)
5. If `../esm-common-modules` has changes: `npm run build` there

Report each gate as ✅, ❌ (with the first relevant error lines, verbatim) or n/a (script missing or not applicable). Never mark a gate as passed unless you saw it pass. Do not fix failures unless the user asks.
