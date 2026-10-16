---
name: backend-review
description: Review gaia-be backend changes (current diff, branch or given paths) against the project's rules — SOLID, controller→service→repository layering, contracts in @moderta/api-contracts/gaia with no duplication, Zod validation, auth and ownership scoping, Sequelize/migration rules, API conventions and tests. Use when asked to review, check, or audit backend code, before opening a PR, or as the final step of a module/endpoint implementation.
---

# Backend review

Read the rules being enforced: all of `.ai/instructions/*.md`. Do not restate them in findings; cite them (`architecture.md › Layering`).

## 1. Scope

```bash
git diff --stat main...HEAD   # or: git diff --stat (uncommitted) / the paths given
```
Read every changed file fully and the direct callers/callees it touches. Also check the contracts diff in `../esm-common-modules` if it changed.

## 2. Checklist

**Blockers**
- Auth: route reachable without the guard (missing on a non-`@Public` path), or `@Public` on something user-scoped.
- Ownership: a query on user data without the owner predicate in the repository `where`; 403/200 where 404 is required.
- Validation: external input (body/query/params) not passing a Zod contract schema.
- Data leak: raw model/row returned, or internal columns (password_hash, tokens) in a response.
- SQL injection: string-built SQL.
- Migration: schema change without migration, missing/broken `down`, edited already-applied migration.
- Secrets in code, logs, fixtures.
- Duplication: request/response type, domain value list, schema, limit or message declared in gaia-be (run `duplication-audit` on changed paths).

**Major**
- Layering: controller with logic or Sequelize access; service importing models/`Op`/`Sequelize`; repository throwing HTTP exceptions or containing business rules; cross-module repository injection.
- DIP: service depends on a concrete repository class instead of the token.
- SRP: service/class mixing unrelated use cases or > ~300 lines without reason.
- Multi-write use case without a transaction.
- Missing tests for changed behaviour (service rules, e2e matrix).
- Contract change that breaks consumers without version bump/notice.

**Minor**
- Naming/file layout deviations, missing Swagger decorators, non-intent method names, missing indexes for new filters, N+1 queries.

## 3. Run the gates

`npm run lint`, `npm run build`, and `npm test` / `npm run test:e2e` when they exist. Paste failures verbatim. A missing script is reported as "not available", never as passing.

## 4. Output

```
## Backend review: <scope>
Verdict: APPROVE | CHANGES REQUIRED
Gates: lint ✅/❌ · build ✅/❌ · test ✅/❌/n/a · e2e ✅/❌/n/a
### Blockers
1. <file:line>: <problem> (rule: <file › section>). Fix: <concrete change>
### Major
### Minor
### Good
```
Only report issues you verified in the code. No speculative findings.
