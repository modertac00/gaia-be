---
name: duplication-audit
description: Audit gaia-be for duplicated or misplaced code — local domain value arrays, request/response types, validation rules, limits and messages that belong in @moderta/api-contracts/gaia; copy-pasted logic that belongs in src/common or a shared provider — and optionally extract them. Use when asked to find duplication, "DRY up", clean up, move types to common modules, or before/after a refactor; also used by backend-review.
---

# Duplication audit

Rules: `.ai/instructions/contracts-rules.md` (tripwires section), `coding-standards.md` (DRY placement).

## Mode

- **Report** (default): findings only, no edits.
- **Extract**: only when the user asks. Use the `contract-schema` skill for contract moves and `nestjs-cross-cutting` for framework helpers; one concept per change, build green after each.

## 1. Scan

Run the detectors in `references/detectors.md` over the target path (default `src/` and `scripts/`). Then read the hits; grep only nominates candidates.

## 2. Cross-check against contracts

For each candidate, search `../esm-common-modules/src` (all areas, not just `gaia/`) for an existing equivalent. Classify:

| Class | Meaning | Destination |
|---|---|---|
| CONTRACT-EXISTS | Equivalent already in contracts | Replace local copy with import |
| CONTRACT-NEW | Crosses the HTTP boundary or is needed by gaia-fe | `src/gaia/*` via `contract-schema` |
| COMMON | Framework/helper logic repeated across modules | `src/common/*` |
| MODULE-LOCAL | Repeated within one module only | private helper in that module |
| OK | Looks similar but has different meaning | none; say why |

## 3. Report format

```
## Duplication audit: <path> (<date>)
| # | Class | Symbol / pattern | Locations (file:line) | Destination | Effort |
|---|---|---|---|---|---|
Summary: N findings (X contract, Y common, Z local). Suggested extraction order: ...
```
Order extraction by dependency: contract constants → schemas → types → helpers → call sites.
