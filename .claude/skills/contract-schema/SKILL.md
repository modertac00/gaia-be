---
name: contract-schema
description: Add or change Gaia shared contracts in the common-modules package (@moderta/api-contracts/gaia, repo ../esm-common-modules) — Zod request/response schemas, inferred DTO types, enum-like const lists, pagination schemas, validation limits and message constants. Use before implementing any gaia-be endpoint that needs a new payload/response shape or domain value list, when extracting duplicated local types/constants/schemas out of gaia-be, or when gaia-fe and gaia-be need the same type.
---

# Contract schema (common modules)

Rules: `.ai/instructions/contracts-rules.md`. Also read `../esm-common-modules/AGENTS.md` (that repo's own guide wins inside that repo).

## 1. Search before creating

```bash
cd ../esm-common-modules
grep -rn "<Concept>\|<concept>" src/gaia src/common src/validation src/chat src/response-contracts.ts
```
- Exact or near match exists → reuse or extend it (`.extend()`, `.partial()`, `.pick()`), never fork a copy.
- Org-level primitive exists (e.g. `AUTH_VALIDATION_LIMITS`, `HttpStatus`, `normalizeString`) → import it.
Report what was reused.

## 2. First-time wiring (only if `src/gaia/index.ts` does not exist)

1. Create `src/gaia/index.ts` and `src/gaia/pagination.contract.ts` from `templates/pagination.contract.ts`.
2. Add `src/gaia/index.ts` to the tsup entries in the `build` script of `package.json`.
3. Add the `"./gaia"` entry to `exports` (types/import/require pointing at `dist/gaia/index.*`), mirroring `./chat`.

## 3. Write the contract (templates in `templates/`)

| What | File | Template |
|---|---|---|
| Domain value lists, limits, messages | `src/gaia/common/<topic>.ts` | `common.ts` |
| Request body/query/param schemas + `*Dto` types | `src/gaia/<feature>.schema.ts` | `feature.schema.ts` |
| Response schemas + types | `src/gaia/<feature>.contract.ts` | `feature.contract.ts` |

Rules of thumb:
- Derive, don't repeat: `z.enum` from the const list values; update = `create.partial()`; list query = `cursorPageQuerySchema.extend({...})`.
- Bodies are `.strict()`. Query numbers use `z.coerce`. Strings get `.trim()` and max lengths from limits.
- Response schemas describe what clients receive: dates as ISO strings (`z.iso.datetime()`), no internal columns.
- Export every new file from `src/gaia/index.ts`.
- Breaking change (removed/renamed field, narrowed type)? Stop and list affected consumers (gaia-be, gaia-fe) before proceeding.

## 4. Build and version

```bash
cd ../esm-common-modules && npm run build
```
Do not edit `version` in its `package.json` and do not publish (no `npm publish`, GitHub release/tag or `publish.yml` trigger): a person bumps the version and publishes after manual review. Recommend the bump (patch additive / minor breaking while 0.x) and tell the user that gaia-be needs `@moderta/api-contracts@<version>` once a person has released it (for local dev only: `npm install ../esm-common-modules`, never committed).

## 5. Consume in gaia-be

Import from the subpath only: `import { createResearchSchema, type CreateResearchDto } from '@moderta/api-contracts/gaia'`. Delete the local duplicate in the same change.
