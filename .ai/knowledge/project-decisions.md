# Project decisions (ADR log)

Append new decisions at the bottom: date, decision, why, consequences.

## 2026-10-15 — Org backend conventions adopted as target
- **Decision:** Zod validation via `ZodValidationPipe`; Sequelize ORM; controller → service → repository (DI token) layering; SOLID; shared types/enums/constants/schemas in `@moderta/api-contracts` under `src/gaia/` (`@moderta/api-contracts/gaia`).
- **Why:** Organization standard shared with esm-api and other ESM services; one contract source for gaia-be and gaia-fe removes duplication.
- **Consequences:** Existing code (raw `pg` + SQL migrations, class-validator DTOs, per-handler bearer parsing, local enum arrays) is legacy. New work follows `.ai/instructions/*`; touched modules migrate toward it. Missing shared building blocks (pipe, guard, decorators, Sequelize module, Jest) are created on first need via the `nestjs-cross-cutting` skill.

## 2026-10-15 — Legacy compatibility endpoints
- **Decision:** `GET /init`, `GET/POST /research-documents` remain as a bridge over `app_init_data` until gaia-fe uses `/research` APIs (see `docs/gaia-db-plan.md`).
- **Consequences:** Do not add features to them.

## 2026-10-26 — Supabase auth proxied by the backend
- **Decision:** Supabase is the identity provider, proxied by gaia-be (`/auth/*`). Roles are stored in `app_metadata.gaia` (`{ roles, abilities? }`), never in `user_metadata` (user-editable). The Supabase project is shared with the ESM product, so login and the global guard reject (403) any user without `app_metadata.gaia`. Signup creates the user through the admin API with `email_confirm: true` and the default role, then signs in. Abilities will be derived from roles through `RoleAbilityRegistry` (empty today; `@RequireAbilities`/guard planned). Google/OAuth is deferred (`GAIA_OAUTH_PROVIDERS` reserved; invite-only intent). Responses use a universal envelope (`ApiSuccessResponse`/`ApiErrorResponse`) via a global interceptor and filter. Env is Zod-validated at boot with typed `registerAs` namespaces (`app`, `supabase`, `database`).
- **Why:** One user store for the org, no password handling in gaia-be, role data the client cannot tamper with, and a single response shape for gaia-fe.
- **Consequences:** Legacy local JWT/bcrypt auth, `app_users` repository and `JWT_*` env removed from the app (legacy scripts and SQL migrations remain until retired). Tests (Jest) and a profile table/migration are deferred. `@moderta/api-contracts` must be published at the version in `package.json` before `npm ci`/Docker builds work.

