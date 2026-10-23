---
description: Add or extend Gaia shared contracts (Zod schemas, types, enum lists, limits, messages) in @moderta/api-contracts/gaia
argument-hint: <concept> [fields / values / purpose]
---

Use the `contracts-steward` agent to add or extend the Gaia contract: **$ARGUMENTS**

Requirements:
- Search for existing equivalents first and reuse or extend them.
- Follow `.ai/instructions/contracts-rules.md`.
- Build `../esm-common-modules`. Recommend the version bump but do not edit the version or publish; a person does both.

Then report back:
- the exported symbols;
- the import lines for gaia-be;
- whether the change is breaking.

If gaia-be has local duplicates of this concept, list them (file:line) and offer to replace them.
