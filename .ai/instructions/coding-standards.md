# Coding standards

## SOLID in this codebase

| Principle | Do | Don't |
|---|---|---|
| **S**ingle responsibility | One use-case cluster per service; split a service over ~300 lines or with unrelated methods into focused services | A 600-line service holding SQL, mapping and business rules |
| **O**pen/closed | Add behaviour with new providers/strategies registered in DI (e.g. a `ResearchTypeHandler` map) | Growing `switch` statements across services for each new type |
| **L**iskov | Repository implementations honour the interface contract exactly (same null/empty semantics) | An implementation that throws where the interface promises `null` |
| **I**nterface segregation | Small repository ports per consumer need (`ResearchReader`, `ResearchWriter` when consumers differ) | One giant repository interface every module depends on |
| **D**ependency inversion | Inject tokens/interfaces; `useClass` binding in the module | `new SomeService()`, importing a concrete repository into a service |

## DRY: where reuse lives

1. Shared across **repos** (types, enums, constants, Zod schemas, limits, messages) → `@moderta/api-contracts/gaia`.
2. Shared across **modules** in gaia-be (pipes, guards, decorators, pagination helpers, base repository utilities) → `src/common`.
3. Shared within **one module** → a private helper/mapper file in that module.
Before writing any type, constant, schema or helper, search those three places first. Copy-paste of logic ≥ 3 lines is a review blocker.

## TypeScript

- `strict` on. No `any`; use `unknown` + narrowing. No non-null `!` unless proven by preceding code.
- Types come from `z.infer<typeof schema>` in contracts; do not hand-write a parallel interface.
- Use enum-like `as const` lists from contracts (`RESEARCH_STATUSES`) and their derived unions; never raw string literals for domain values.
- `readonly` constructor injection: `constructor(@Inject(TOKEN) private readonly repo: ResearchRepository) {}`.

## Naming

- Files: kebab-case `<feature>.<role>.ts` (`research.service.ts`, `sequelize-research.repository.ts`, `research-note.model.ts`).
- Classes: `PascalCase` + role suffix (`ResearchService`, `SequelizeResearchRepository`, `ResearchNoteModel`).
- DI tokens: `UPPER_SNAKE` `Symbol('RESEARCH_REPOSITORY')`, exported next to the interface.
- Methods: verbs describing intent (`archive`, `findOwnedById`), not CRUD-generic names, when a business meaning exists.

## Errors

- Services throw Nest HTTP exceptions with message constants from contracts (e.g. `NotFoundException(RESEARCH_NOT_FOUND_MESSAGE)`), or domain errors mapped by the global filter.
- Never swallow errors; never `catch` only to rethrow the same thing.
- Repositories return `null` for "not found"; the service decides it is a 404.

## General

- Composition over inheritance. A generic base repository is allowed only for genuinely identical CRUD helpers (pagination, findOwnedById).
- Small pure functions; early returns; no nested ternaries.
- Comments explain *why*, not *what*. No commented-out code.
- No unrelated refactors inside a feature change.
