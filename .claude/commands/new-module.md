---
description: Design and build a new gaia-be feature module end-to-end (explore → spec → contracts → implement → test → review)
argument-hint: <feature-name> [short description]
---

Build the gaia-be feature module: **$ARGUMENTS**

Run this pipeline. Pass each agent the outputs of the previous steps; do not redo their work yourself.

1. **Explore:** use the `backend-explorer` agent to build the reuse map for this module.
2. **Design:** use the `backend-architect` agent with the request and the reuse map to write `.ai/specs/active/<feature>.md` from the module template.
3. **Approval gate:** show the user the spec summary and open questions. **Stop and wait for approval** before writing code.
4. **Contracts:** use the `contracts-steward` agent to create or extend the contracts listed in the spec.
5. **Implement:** use the `nestjs-implementer` agent with the spec and the contract import lines.
6. **Test:** use the `test-engineer` agent for the spec's test matrix.
7. **Review:** use the `backend-reviewer` agent on the full diff (gaia-be and esm-common-modules). If it reports blockers, send them back to `nestjs-implementer` (or `contracts-steward`) once, then review again.
8. **Report:** files changed in both repos, contract version bump, real gate results, and any follow-ups (for example: publish contracts, then bump `@moderta/api-contracts` in gaia-be).
