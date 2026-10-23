# API conventions

## Routes

- Plural kebab-case nouns: `/research`, `/research/:researchId/notes/:noteId/sections`.
- Nest at most two levels; deeper resources get their own top-level route when they have their own identity.
- Path params named `<entity>Id`, validated as UUID via a contract schema or `ParseUUIDPipe`.
- Non-CRUD actions are POST sub-resources with a verb: `POST /research/:researchId/submit-review`, `.../chats/run`.

## Verbs and status codes

| Action | Verb | Status | Body |
|---|---|---|---|
| List | GET | 200 | `{ items, nextCursor }` |
| Get | GET | 200 | resource |
| Create | POST | 201 | full created resource |
| Partial update | PATCH | 200 | full updated resource |
| Archive/delete | DELETE | 204 | none |
| Action | POST | 200/202 | action result |

Always return the full resource contract (not partial `{ id, status }` objects) so clients can reuse one type.

## Validation

- Bind schemas from `@moderta/api-contracts/gaia` with `ZodValidationPipe`:
  `@Body(new ZodValidationPipe(createResearchSchema)) body: CreateResearchDto`
  `@Query(new ZodValidationPipe(listResearchQuerySchema)) query: ListResearchQuery`
- Query numbers use `z.coerce.number()` in the schema.

## Pagination and filtering

- Cursor pagination via the shared `cursorPageQuerySchema` (`cursor?: string`, `limit: 1..100`, default per endpoint) extended per endpoint with filters (`status`, `search`, ...).
- Response via shared `cursorPageSchema(itemSchema)` → `{ items: T[]; nextCursor: string | null }`.

## Errors

Single envelope produced by the global exception filter:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": { "title": ["Too small: expected string to have >=1 characters"], "author": { "name": ["Required"] } }
}
```

`errors` is present only for validation failures (shape produced by `ZodValidationPipe`). It is an object mirroring the request body/query: keys are the same field names the client sent, nested objects for nested fields, and each invalid field maps to a `string[]` of its messages. A failure with no field path is reported under `body`. Use 400 validation, 401 unauthenticated, 403 forbidden action, 404 not found **or not owned** (never reveal existence of others' resources), 409 conflict/version mismatch.

## Swagger

- Swagger metadata lives in `<feature>.swagger.ts` next to the controller, never inline. Export one composed decorator per handler (`applyDecorators(ApiOperation, ApiOkResponse/ApiCreatedResponse, ...)`, e.g. `ApiListResearch()`) and one class-level decorator (`ApiResearchController()`) that applies `@ApiTags('<feature>')` and `@ApiBearerAuth()` (omitted for `@Public()` controllers).
- The controller shows only routing, pipes and delegation: one composed Swagger decorator per handler, no raw `@Api*` decorators.
- Generate schema docs from the Zod contracts (e.g. `zod` → JSON schema helper) instead of duplicating DTO classes for Swagger.
