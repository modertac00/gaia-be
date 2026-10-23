# Contracts rules (common modules)

The org's contract layer is `@moderta/api-contracts`, repo `../esm-common-modules`. Gaia contracts live in **`src/gaia/`** there and are consumed as `@moderta/api-contracts/gaia`. Read `../esm-common-modules/AGENTS.md` before editing it.

## What MUST live in contracts

- Domain enum-like lists and their unions (`RESEARCH_TYPES`, `ResearchType`).
- Zod schemas for every request body, query and path param set, and the inferred types.
- Response shapes that a client consumes.
- Shared pagination/query building blocks (`cursorPageQuerySchema`, `cursorPageSchema(item)`).
- Validation limits (`GAIA_LIMITS.TITLE_MAX`) and user-facing message constants.
- Anything a frontend (gaia-fe) or a second backend also needs.

## What stays in gaia-be

- Sequelize models, repository interfaces and DI tokens, mappers.
- Internal-only types that never cross the HTTP boundary.
- Framework glue (pipes, guards, decorators).

## File layout and naming (in esm-common-modules)

```
src/gaia/
  index.ts                     # barrel: export * from each file
  common/<topic>.ts            # as const lists + derived unions, limits, messages
  <feature>.schema.ts          # request schemas + inferred Dto types
  <feature>.contract.ts        # response schemas + inferred types
  pagination.contract.ts       # gaia cursor pagination
```

- Enum list: `export const RESEARCH_STATUSES = [{ value: "draft", label: "Draft" }, ...] as const;` then `export type ResearchStatus = (typeof RESEARCH_STATUSES)[number]["value"];` and a `researchStatusSchema = z.enum(...)` derived from it (never retype values).
- Request: `export const createResearchSchema = z.object({...})` + `export type CreateResearchDto = z.infer<typeof createResearchSchema>`.
- Update: derive, don't duplicate: `export const updateResearchSchema = createResearchSchema.partial()`.
- Response: `export const researchSchema = z.object({...})` + `export type Research = z.infer<typeof researchSchema>`.
- Reuse existing org-level pieces first (e.g. `AUTH_VALIDATION_LIMITS` in `src/validation/auth.schema.ts`, `HttpStatus` in `src/common/http-status-code.ts`).
- Package is Zod 4 (peer dependency). Use Zod 4 APIs.

## Wiring a new subpath (first time only)

1. Add `src/gaia/index.ts` to the tsup entry list in the `build` script.
2. Add `"./gaia": { "types": "./dist/gaia/index.d.ts", "import": "./dist/gaia/index.mjs", "require": "./dist/gaia/index.js" }` to `exports`.
3. `npm run build` must succeed.

## Release flow

1. Change contracts → `npm run build` in esm-common-modules.
2. Report the version bump needed (patch for additive, minor for breaking, while 0.x) and list consumers that must update for any breaking change. A person bumps `version` in `package.json` manually; an agent does not.
3. An agent never publishes the library: no `npm publish`, no GitHub release or tag, no triggering `.github/workflows/publish.yml`. Publishing happens only after a person has manually reviewed the contract changes and version.
4. Local development before publish: in gaia-be, `npm install ../esm-common-modules` is acceptable temporarily; never commit a `file:` dependency.
5. Bump `@moderta/api-contracts` in gaia-be `package.json` only after a person has published the new version.

## Duplication tripwires

Treat any of these in gaia-be as a defect: a local `const xs = ['a','b']` of domain values; an `interface`/`type` describing a request or response body; a local Zod schema for an HTTP payload; a hardcoded validation limit; the same message string in two files.
