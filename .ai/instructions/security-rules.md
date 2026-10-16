# Security rules

## Authentication

- A global `JwtAuthGuard` (registered with `APP_GUARD`) authenticates every route. Opt out only with `@Public()` (health, login).
- Controllers get the user via `@CurrentUser() user: AuthenticatedUser`. Never parse the `Authorization` header in a controller or service.
- JWT secret and expiry come from validated config (`JWT_SECRET` required, no fallback).
- Passwords: bcrypt hash only; never log, return or compare plaintext outside the auth service.

## Authorization and ownership

- Every read/write of user-owned data is scoped by the owner in the **repository query** (`where: { id, ownerId }`), not by fetching and comparing afterwards.
- Child resources are scoped through their parent (`note.researchId` → research owned by user).
- Not found and not owned both return 404.
- Role/permission checks (when added) use a guard + metadata decorator, not `if` chains in services.

## Input and output

- All external input passes a Zod schema (body, query, params). No `forbidNonWhitelisted` gaps: object schemas are `.strict()` for bodies unless explicitly extensible.
- Responses are built by mappers from contract types; never return raw models (prevents leaking columns like `password_hash`).
- Sequelize replacements/bind params only; no string-built SQL.

## Secrets and data

- Never read, print or commit `.env*`. Use `.env.example` for documentation.
- No secrets, tokens or personal data in logs, fixtures, test snapshots or error messages.
- LLM prompts/outputs stored for audit must not include credentials.
