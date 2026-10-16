# Module spec: <feature>

## Goal
<one paragraph: user-facing capability and why>

## Reuse check (filled by backend-explorer)
- Analogous module: <path>
- Existing contracts to reuse: <@moderta/api-contracts/... symbols>
- Existing common building blocks: <src/common/... or "missing: X (create via nestjs-cross-cutting)">

## Contracts (esm-common-modules `src/gaia/`)
| Symbol | File | New/Existing | Notes |
|---|---|---|---|

## Data model
| Table | Columns (type, null, default) | Indexes | FKs |
|---|---|---|---|
Migration: <name>

## Endpoints
| Verb | Path | Request schema | Response schema | Status | Auth/ownership |
|---|---|---|---|---|---|

## Design
- Repository port `<Feature>Repository` (token `<FEATURE>_REPOSITORY`) methods: <signatures>
- Service use cases and business rules: <list>
- Transactions: <which use cases>
- Cross-module dependencies (exported services only): <list>

## Files
<create/modify list with paths>

## Tests
<service unit cases, controller cases, e2e matrix>

## Open questions
