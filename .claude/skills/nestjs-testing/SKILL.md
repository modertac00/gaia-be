---
name: nestjs-testing
description: Write and run gaia-be tests — Jest unit tests for services with mocked repository tokens, controller tests through ZodValidationPipe, repository integration tests against Postgres, and supertest e2e tests covering validation, auth and ownership. Use when adding tests for a module/endpoint, when asked to "add tests", "cover", "test this", or when setting up Jest in gaia-be for the first time.
---

# NestJS tests

Rules: `.ai/instructions/testing-rules.md`.

## 0. First-time setup (if `package.json` has no `test` script)

1. Dev deps: `jest ts-jest @types/jest @nestjs/testing supertest @types/supertest`.
2. Add `jest.config.ts` from `templates/jest.config.ts` and `test/jest-e2e.config.ts` (same, `testRegex: '.e2e-spec.ts$'`, `rootDir: '..'`).
3. Scripts: `"test": "jest"`, `"test:e2e": "jest -c test/jest-e2e.config.ts --runInBand"`.
4. Tell the user what was added.

## 1. Pick the levels

| Change | Required tests |
|---|---|
| Service logic | `templates/service.spec.ts` pattern |
| New/changed handler | `templates/controller.spec.ts` pattern + e2e matrix |
| Non-trivial query (filters, pagination, joins) | repository integration test |
| Guard/pipe/filter | unit test with mocked `ExecutionContext` / direct `transform` call |

## 2. Write

- Mock the repository **token** with a typed factory (`createMockRepository()` in the template); never mock Sequelize models in service tests.
- Build inputs with factories in `test/factories/` typed by contract DTOs.
- E2E (`templates/feature.e2e-spec.ts`): boot `AppModule`, sign a JWT with `JwtService`, assert responses with the contract schema (`researchSchema.parse(res.body)`), cover happy / 400 / 401 / 404-other-user / 404-missing.
- One behaviour per `it`; names state the rule.

## 3. Run and report

```bash
npm test -- <path-or-pattern>
npm run test:e2e   # needs docker compose Postgres + migrations
```
Report the real pass/fail output. If a test fails, investigate (superpowers:systematic-debugging) instead of weakening the assertion.
