# gaia-be Agent Guide

## Start here

Read `.ai/instructions/architecture.md` plus the instruction files relevant to the task before editing. Inspect the nearest implementation; documentation never overrides executable code, but **new code follows the target conventions below even where legacy code does not.**

## Project

Gaia research backend: NestJS 11 API over PostgreSQL. Users create research requests, which produce versioned notes (with sections), knowledge-base papers and note chat threads; approved research is handed to Atlas. Domain terms: `.ai/knowledge/domain-glossary.md`. Data model plan: `docs/gaia-db-plan.md`.

Target stack: Node.js, TypeScript (strict), NestJS 11, Sequelize (`@nestjs/sequelize`), PostgreSQL, Zod (`ZodValidationPipe`), JWT auth, Jest + supertest, contracts from `@moderta/api-contracts/gaia` (repo `../esm-common-modules`).

## Non-negotiables

1. **Contracts first, never duplicated.** Request/response schemas, inferred types, domain enum lists, limits and messages live in `@moderta/api-contracts/gaia`. Search there before declaring any type. → `.ai/instructions/contracts-rules.md`
2. **Controller → service → repository.** Thin controllers; services depend on repository tokens/interfaces; only Sequelize repositories touch models. → `.ai/instructions/architecture.md`
3. **SOLID and DRY.** → `.ai/instructions/coding-standards.md`
4. **Auth and ownership at the boundary.** Global guard + `@CurrentUser()`; ownership predicate inside every repository query. → `.ai/instructions/security-rules.md`
5. **Sequelize models + migrations** for every schema change. → `.ai/instructions/database-rules.md`
6. **API shape** (routes, status codes, cursor pagination, error envelope). → `.ai/instructions/api-conventions.md`
7. **Tests for every behaviour change.** → `.ai/instructions/testing-rules.md`
8. Keep secrets out of source, logs and fixtures; never read `.env*`. Avoid unrelated cleanup; preserve user changes.

## Legacy state (known gaps, do not copy)

Raw `pg` services and `migrations/*.sql`; class-validator DTOs; bearer token parsed in controllers (copied in 4 files); local enum arrays; `research-note-chats` registered inside `ResearchModule`; no tests, Swagger, guards or contracts dependency. Missing building blocks are created on first need via the `nestjs-cross-cutting` skill. Decisions: `.ai/knowledge/project-decisions.md`.

## Tooling

- Skills (`.claude/skills/`): `nestjs-module`, `nestjs-endpoint`, `contract-schema`, `sequelize-model-migration`, `nestjs-cross-cutting`, `nestjs-testing`, `duplication-audit`, `backend-review`.
- Agents (`.claude/agents/`): `backend-explorer`, `backend-architect`, `contracts-steward`, `nestjs-implementer`, `test-engineer`, `backend-reviewer`.
- Commands: `/new-module`, `/new-endpoint`, `/add-contract`, `/new-migration`, `/audit-duplication`, `/review-backend`, `/verify`.
- Specs: write planned work to `.ai/specs/active/<name>.md` from `.ai/specs/templates/`.

## Verification

Current: `npm ci`; `npm run lint`; `npm run build`; `npm run db:migrate` (needs Postgres from `docker-compose.yml`).
Once added: `npm test`; `npm run test:e2e`.
Contracts repo: `cd ../esm-common-modules && npm run build`.

Run the smallest relevant checks during development and all applicable gates before handoff. If a command does not exist yet, say so; never report success you did not observe.
