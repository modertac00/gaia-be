---
description: Add or change one gaia-be API endpoint end-to-end (contracts → handler → service → repository → tests → review)
argument-hint: <module> <METHOD> <path> [purpose]
---

Add or change the endpoint: **$ARGUMENTS**

1. **Explore:** use the `backend-explorer` agent, scoped to the owning module and related contracts.
2. **Size the change:**
   - It needs a schema change, a new module, or non-trivial business rules → use the `backend-architect` agent to write `.ai/specs/active/<endpoint>.md` (endpoint template), show the user the summary, and wait for approval.
   - Otherwise → write the short endpoint spec inline in your reply and continue.
3. **Contracts:** use the `contracts-steward` agent for any new or extended request/response schema, limit or message.
4. **Implement:** use the `nestjs-implementer` agent, following the `nestjs-endpoint` skill.
5. **Test:** use the `test-engineer` agent for service cases plus the e2e matrix for this route.
6. **Review:** use the `backend-reviewer` agent on the diff. Fix blockers once, then review again.
7. **Report:** the route and contract summary, files changed, and real gate results.
