---
description: Create a Sequelize model change + reversible migration for gaia-be
argument-hint: <description of the schema change>
---

Schema change: **$ARGUMENTS**

1. Use the `backend-explorer` agent to find the affected models, repositories, and legacy SQL in `migrations/`.
2. Use the `nestjs-implementer` agent, following the `sequelize-model-migration` skill.
   - The first time, stop at the runner/baseline decision in step 0 of that skill and ask the user before changing `db:migrate`.
   - Model and migration must stay consistent.
   - Values for any new domain column come from the contract list. If a contract is missing, use the `contracts-steward` agent first.
3. Run `up`, then `down`, then `up` again against local docker Postgres only, and report the real output.
4. List the repository and service methods that must change to use the new columns. Implement them only if they were part of the request.
