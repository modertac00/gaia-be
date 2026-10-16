---
name: nestjs-endpoint
description: Add or change a single API endpoint in an existing gaia-be module end-to-end — contract schema, ZodValidationPipe binding, thin controller handler, service use case, repository method with ownership predicate, mapper, Swagger and tests. Use when the user asks to add/modify/expose a route, an action endpoint (submit-review, approve, run), a filter or query param, or a response field.
---

# Add or change one endpoint

Rules: `.ai/instructions/api-conventions.md`, `architecture.md`, `security-rules.md`, `contracts-rules.md`. Code shapes: the `nestjs-module` skill templates (match the handler/service/repository method you need).

## Steps

0. **Reality check (do this before designing).** The rules describe the target architecture, and the repo may not be there yet. Check what actually exists: the `@moderta/api-contracts/gaia` subpath (`ls ../esm-common-modules/src/gaia`), `src/common` (`ZodValidationPipe`, auth guard, `@CurrentUser`), and the owning module's layering (does it have a repository port, or does the service query `pg` directly?). Then pick one path and say which in your first message:
   - **Prerequisites exist** → follow the steps below as written.
   - **Prerequisites missing and the change is small** → add the endpoint in the owning module's current style, keep it thin and ownership-scoped, and list each target-architecture rule you could not follow and why. Do not invent a half-built `src/common` or contracts subpath inside this task.
   - **Prerequisites missing and the endpoint needs them** (new payload shape, shared enum, new persistence) → stop after the spec and name the prerequisite skill to run first (`contract-schema`, `nestjs-cross-cutting`, `sequelize-model-migration`). Silent workarounds create the duplication the rules exist to prevent.
1. **Locate the owner.** Find the module that owns the resource (`grep -rn "@Controller(" src`). If the endpoint belongs to a resource with no module yet, use `nestjs-module` instead. If the owning module is legacy (raw `pg`, class-validator), follow its file locations but apply the target conventions to the code you add; propose migrating the module if the change is large.
2. **Spec it** (one paragraph is fine for small changes; `.ai/specs/templates/endpoint.md` for anything with new persistence or business rules). Decide verb, path, status code, request/response contracts, ownership predicate, errors.
3. **Contracts first** via `contract-schema`: request schema (body/query), response schema; reuse/extend existing ones. Adding a response field = extend the response schema, not a new type.
4. **Repository.** Add an intent-named method to the port and its Sequelize implementation; ownership id in the signature and the `where`. Accept `RepositoryOptions` if it can run in a transaction. Need a column/table? `sequelize-model-migration` first.
5. **Service.** Add the use case: business rules, 404/409 decisions with contract message constants, transaction via `TRANSACTION_RUNNER` if it writes more than once.
6. **Mapper.** Extend the mapper if the response changed.
7. **Controller.** One handler: decorators (`@Get/@Post…`, `@HttpCode`, Swagger), `@CurrentUser()`, `ZodValidationPipe(schema)`, delegate in one line.
8. **Tests** via `nestjs-testing`: service cases for each rule; e2e matrix (happy, 400, 401, 404 other user, 404 missing; 409 if applicable).
9. **Verify**: `npm run lint && npm run build` (+ tests when present). Update `README.md`'s API list if it lists routes.

## Final report

End with: files changed; which path from step 0 you took; rules you could not follow and why; commands you actually ran and their result (never claim lint/build/tests passed unless you ran them).

## Checks before finishing

- Controller handler has no logic beyond delegation.
- No new local type/interface/const describing payloads or domain values.
- Response matches the contract (`schema.parse` in e2e).
- Legacy compatibility endpoints (`/init`, `/research-documents`) were not extended.
