---
name: nestjs-cross-cutting
description: Create or modify gaia-be cross-cutting building blocks in src/common, src/config and src/database — ZodValidationPipe, global JWT auth guard with @Public and @CurrentUser, global exception filter, Zod-validated env config, Sequelize database module, cursor pagination helpers, transaction runner. Use when a feature needs one of these and it does not exist yet, when adding a new guard/decorator/pipe/interceptor/filter, or when replacing per-handler boilerplate (e.g. bearer-token parsing) with a shared mechanism.
---

# Cross-cutting building blocks

Rules: `.ai/instructions/architecture.md` (cross-cutting section), `security-rules.md`, `api-conventions.md`.

## 1. Check what already exists

```bash
ls src/common src/config src/database 2>/dev/null
grep -rn "ZodValidationPipe\|APP_GUARD\|createParamDecorator\|APP_FILTER\|SequelizeModule.forRoot" src
```
Reuse anything found. Never create a second pipe/guard/filter doing the same job.

## 2. Create only the missing pieces, from the references

| Need | Reference (copy, adapt imports) | Target path |
|---|---|---|
| Request validation | `references/zod-validation.pipe.ts` | `src/common/pipes/zod-validation.pipe.ts` |
| Authentication | `references/auth.ts` (guard, `@Public`, `@CurrentUser`, `AuthenticatedUser`) | `src/common/auth/*` |
| Error envelope | `references/http-exception.filter.ts` | `src/common/filters/http-exception.filter.ts` |
| Typed env config | `references/env.config.ts` | `src/config/env.config.ts` |
| Sequelize setup + transactions | `references/database.ts` | `src/database/*` |
| Cursor pagination | `references/cursor-pagination.ts` | `src/common/database/cursor-pagination.ts` |

Split each reference into one-class-per-file at the target path. Dependencies to add if missing: `zod` (match the contracts package major), `@nestjs/sequelize sequelize sequelize-typescript`, `@nestjs/swagger`.

## 3. Register globally (in `AppModule`, not `main.ts`, so tests get them too)

```ts
providers: [
  { provide: APP_GUARD, useClass: JwtAuthGuard },
  { provide: APP_FILTER, useClass: HttpExceptionFilter },
]
```
Mark public routes with `@Public()` (health, `POST /auth/login`).

## 4. Replacing legacy boilerplate

When the guard lands, remove every `@Headers('authorization')` + `extractBearerToken` + `getCurrentUserFromAuthorization` call (currently in `auth.controller.ts`, `auth.service.ts`, `init/init.controller.ts`, `init/research-documents.controller.ts`, research controllers) in favour of `@CurrentUser()`. Behaviour (401 on missing/invalid token) must be identical; cover it with an e2e test.

## 5. New guards / decorators / interceptors

- One responsibility each; configure via metadata decorators (`SetMetadata` + `Reflector`), not constructor flags.
- Keep them free of feature-module imports (`src/common` must not import `src/modules`). If one needs domain data, depend on a port token implemented by the feature module.
- Unit test with a mocked `ExecutionContext`.

## 6. Verify

`npm run lint && npm run build`, plus `npm test` once Jest exists.
