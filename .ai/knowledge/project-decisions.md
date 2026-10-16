# Project decisions (ADR log)

Append new decisions at the bottom: date, decision, why, consequences.

## 2026-10-15 — Org backend conventions adopted as target
- **Decision:** Zod validation via `ZodValidationPipe`; Sequelize ORM; controller → service → repository (DI token) layering; SOLID; shared types/enums/constants/schemas in `@moderta/api-contracts` under `src/gaia/` (`@moderta/api-contracts/gaia`).
- **Why:** Organization standard shared with esm-api and other ESM services; one contract source for gaia-be and gaia-fe removes duplication.
- **Consequences:** Existing code (raw `pg` + SQL migrations, class-validator DTOs, per-handler bearer parsing, local enum arrays) is legacy. New work follows `.ai/instructions/*`; touched modules migrate toward it. Missing shared building blocks (pipe, guard, decorators, Sequelize module, Jest) are created on first need via the `nestjs-cross-cutting` skill.

## 2026-10-15 — Legacy compatibility endpoints
- **Decision:** `GET /init`, `GET/POST /research-documents` remain as a bridge over `app_init_data` until gaia-fe uses `/research` APIs (see `docs/gaia-db-plan.md`).
- **Consequences:** Do not add features to them.
