---
name: nestjs-module
description: Scaffold a complete new gaia-be NestJS feature module following controller → service → repository (DI token) → Sequelize layering, with contracts from @moderta/api-contracts/gaia, mapper, model, migration and tests. Use when the user asks to create/add a new module, resource, domain or feature area in gaia-be (e.g. "create a papers module", "add LLM runs"), or to split an oversized module into its own module.
---

# Scaffold a NestJS feature module

Rules (read, don't re-derive): `.ai/instructions/architecture.md`, `coding-standards.md`, `contracts-rules.md`, `database-rules.md`, `api-conventions.md`, `security-rules.md`.

Placeholders in `templates/` (also used by `nestjs-testing`): `__Feature__` (PascalCase singular, `ResearchNote`), `__featureCamel__` (camelCase, `researchNote`), `__feature__` (kebab, `research-note`, file names and text only), `__FEATURE__` (UPPER_SNAKE, `RESEARCH_NOTE`), `__route__` (URL segment), `__table__` (snake_case table).

## Steps

1. **Spec.** Fill `.ai/specs/templates/module.md` into `.ai/specs/active/<feature>.md` (endpoints, data model, contracts, reuse check). For multi-endpoint modules, get user approval of the spec before writing code.
2. **Reuse check.** Find the closest existing module and existing contracts (`../esm-common-modules/src/gaia`). Confirm foundation pieces exist: `ZodValidationPipe`, `JwtAuthGuard`/`@CurrentUser`, `DatabaseModule` + `TRANSACTION_RUNNER`, cursor pagination helpers. Missing → run the `nestjs-cross-cutting` skill first.
3. **Contracts.** Create/extend schemas, enum lists, limits and messages with the `contract-schema` skill. Nothing request/response-shaped is declared in gaia-be.
4. **Model + migration.** Use the `sequelize-model-migration` skill (`templates/models/feature.model.ts` is the starting point).
5. **Repository port.** `templates/repositories/feature.repository.ts` → `src/modules/<feature>/repositories/<feature>.repository.ts`. Methods named for intent, ownership id in every signature that touches user data, plain `__Feature__Record` return types.
6. **Repository implementation.** `templates/repositories/sequelize-feature.repository.ts`. Only file importing the model/`Op`.
7. **Mapper.** `templates/feature.mapper.ts`: record → contract response.
8. **Service.** `templates/feature.service.ts`: business rules, 404 via contract message constants, transactions via `TRANSACTION_RUNNER` for multi-write use cases.
9. **Controller.** `templates/feature.controller.ts`: thin; `ZodValidationPipe` + contract schemas; `@CurrentUser()`; composed Swagger decorators imported from the feature's swagger file. Also create `templates/feature.swagger.ts` → `<feature>.swagger.ts` (all `@Api*` metadata lives there, not in the controller).
10. **Module.** `templates/feature.module.ts`: bind token with `useClass`, export the service only if another module needs it, register in `AppModule`.
11. **Tests.** Use the `nestjs-testing` skill (service unit + controller + e2e matrix).
12. **Verify.** `npm run lint && npm run build` (+ `npm test`, `npm run test:e2e` when present). Then run the `backend-review` skill on the diff and fix blockers.

Drop template methods the spec does not need (YAGNI); add new ones in the same style. Delete the template comments.
