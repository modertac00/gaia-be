# Testing rules

Stack: Jest + `@nestjs/testing` + supertest (add them if missing: `jest`, `ts-jest`, `@types/jest`, `supertest`, `@types/supertest`, and `test`/`test:e2e` scripts).

## Unit: services (required for every service change)

- Build the module with `Test.createTestingModule`, providing the repository **token** with a typed mock: `{ provide: RESEARCH_REPOSITORY, useValue: createMock<ResearchRepository>() }` (or a hand-written `jest.Mocked<ResearchRepository>` factory).
- No database. Assert business rules, thrown exceptions and the arguments passed to the repository (especially ownership ids).

## Unit: controllers

- Assert the route is wired to the service with the current user and the validated input.
- Run the real `ZodValidationPipe` with the contract schema for at least one invalid payload.

## Integration: repositories (when queries are non-trivial)

- Run against a real Postgres (docker-compose service) with migrations applied; truncate between tests.
- Cover ownership predicates and pagination boundaries (`limit + 1`, `nextCursor`).

## E2E (`test/*.e2e-spec.ts`)

Per endpoint, cover at minimum:
1. Happy path with the response matching the contract schema (`schema.parse(res.body)`).
2. Validation failure → 400 with `errors` keyed by field name (`string[]` per field).
3. Missing/invalid token → 401.
4. Another user's resource → 404.
5. Not found → 404.

## Conventions

- Tests in `__tests__/` next to the code (`<file>.spec.ts`), e2e in `test/`.
- Arrange/act/assert; one behaviour per `it`; descriptive names (`'archives research owned by the user'`).
- Test data builders in `test/factories/`; build payloads from contract types so tests break when contracts change.
- Never claim tests pass without running them; report the actual command output.
