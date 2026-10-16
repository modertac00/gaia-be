---
description: Report duplicated or misplaced types, constants, schemas and logic in gaia-be (report only)
argument-hint: [path, default src/]
---

Use the `backend-reviewer` agent to run the `duplication-audit` skill in **report mode** on: **$ARGUMENTS** (use `src/` if empty)

Present the findings table and the suggested extraction order. **Do not edit anything.**

Then offer these next steps:
- `/add-contract` for the CONTRACT-NEW items;
- a refactor spec, built from `.ai/specs/templates/refactor.md`, for the larger extractions.
