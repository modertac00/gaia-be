# Architecture

gaia-be is a modular NestJS 11 API over PostgreSQL. This file defines the **target** architecture. Where existing code deviates (raw `pg` services, class-validator DTOs, auth parsed per handler), new work follows this file, and refactors move old code toward it.

## Layering (strict, one direction)

```
HTTP ─► Controller ─► Service ─► Repository interface (DI token) ─► Sequelize repository ─► Model
                         │
                         └─► Mapper (plain record → contract response type)
Contracts (@moderta/api-contracts/gaia): Zod schemas + inferred types, used by every layer
```

| Layer | Owns | Must NOT |
|---|---|---|
| Controller | Route, HTTP verb/status, `ZodValidationPipe` binding, `@CurrentUser()`, Swagger | contain business rules, touch models/Sequelize, catch-and-rethrow, map rows |
| Service | Use-case/business rules, orchestration, transactions boundary, domain exceptions | import Sequelize models or `Op`, build SQL, read `Request`/headers |
| Repository interface | Persistence port + DI token + plain `<Entity>Record` types it returns | leak Sequelize models into its signature (only the opaque `Transaction` handle via `RepositoryOptions`) |
| Sequelize repository | Queries, `where` predicates (incl. ownership), pagination, associations; converts rows with `row.get({ plain: true })` | contain business rules, throw HTTP exceptions, or return model instances |
| Model | Table mapping, column types, associations | contain behaviour beyond column getters |
| Mapper | Pure `record → response contract` functions (dates → ISO strings, hide internal columns) | do I/O |

## Module anatomy

```
src/modules/<feature>/
  <feature>.module.ts
  <feature>.controller.ts
  <feature>.service.ts
  <feature>.mapper.ts
  repositories/
    <feature>.repository.ts            # interface + DI token (Symbol)
    sequelize-<feature>.repository.ts  # implementation
  models/<entity>.model.ts
  __tests__/<feature>.service.spec.ts, <feature>.controller.spec.ts
src/common/            # cross-cutting, framework-level only (pipes, guards, decorators, filters, interceptors)
src/database/          # Sequelize module/config, migrations runner
src/config/            # Zod-validated env config
test/                  # e2e (supertest)
```

- **Request/response shapes are never declared in gaia-be.** They come from `@moderta/api-contracts/gaia`. See `contracts-rules.md`.
- Sub-resources (e.g. notes under research) are their own module when they have their own service/repository; register controllers in the module that owns them, never in a sibling's module.

## Dependency rules

- Services depend on the repository **token** and the interface, not the Sequelize class (DIP). Bind with `{ provide: RESEARCH_REPOSITORY, useClass: SequelizeResearchRepository }`.
- A module touching another module's data imports that module and calls its **exported service**. Never inject another module's repository or model.
- `src/common` may not import from `src/modules`. Modules may import from `src/common`.
- No circular module imports; if two modules need each other, extract the shared use case into a third module or an event.

## Cross-cutting (live in `src/common`, created once, reused)

- `ZodValidationPipe`: body/query/param validation against contract schemas.
- Global `JwtAuthGuard` + `@Public()`: authentication. `@CurrentUser()` injects the authenticated user.
- Global exception filter: consistent error envelope (see `api-conventions.md`).
- Config: `ConfigModule` with a Zod env schema; inject typed config, never read `process.env` outside `src/config`.
