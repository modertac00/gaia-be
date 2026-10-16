---
description: Review current gaia-be backend changes against SOLID, layering, contracts, security and test rules
argument-hint: [base-branch or paths, default: diff vs main + uncommitted]
---

Use the `backend-reviewer` agent to review: **$ARGUMENTS** (if empty: the current branch diff against main plus uncommitted changes)

If `../esm-common-modules` has uncommitted changes or new commits related to this work, include its diff too.

Return the reviewer's verdict, gate results and findings unchanged. Do not fix anything unless the user asks.
