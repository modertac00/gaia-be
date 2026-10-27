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

## Responses (universal envelope)

Every response is wrapped by the global `ResponseInterceptor` (success) or `AllExceptionsFilter` (error); handlers return the plain contract body and never build the envelope. Types come from `@moderta/api-contracts/gaia` (`ApiSuccessResponse`, `ApiListResponse`, `ApiErrorResponse`, `API_ERROR_CODE`). There is no `statusCode`/`message`/`timestamp`/`path` in the body: the HTTP status carries the status, and every response has `meta.requestId` (also sent as the `x-request-id` header; a safe inbound `x-request-id` is honoured).

Single resource:

```json
{ "success": true, "data": { "id": "..." }, "meta": { "requestId": "req_7c10a1b2c3d4" } }
```

List (cursor pagination): the service returns `paginated(page, limit)` (a `ListResult`), the interceptor emits

```json
{ "success": true, "data": [ { "id": "..." } ], "meta": { "requestId": "req_...", "limit": 20, "nextCursor": "..." } }
```

`meta.nextCursor` is `null` on the last page. Extra meta keys: return `withMeta(data, { ... })` (merged next to `requestId`). 204, empty bodies, `StreamableFile`/`Buffer` and handlers that write the response themselves are not wrapped. Auth endpoints that return `{ message }` keep it inside `data`.

## Errors

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Validation failed",
    "details": { "fields": { "title": ["Too small: expected string to have >=1 characters"], "author.name": ["Required"] } }
  },
  "meta": { "requestId": "req_7c12a1b2c3d4" }
}
```

- `code` is derived from the HTTP status (400 `BAD_REQUEST`, 401 `UNAUTHORIZED`, 403 `FORBIDDEN`, 404 `NOT_FOUND`, 409 `CONFLICT`, 422 `UNPROCESSABLE_ENTITY`, 429 `RATE_LIMITED`, 503 `SERVICE_UNAVAILABLE`, other 4xx `BAD_REQUEST`, 5xx `INTERNAL_ERROR`) unless the thrown error sets its own.
- Validation failures (`ZodValidationPipe`, or `throw new ValidationFailedException(fields)` in a service) are 400 `VALIDATION_FAILED` with `details.fields`: a flat map of dotted field path to `string[]` messages; a failure with no path is reported under `body`.
- A service can throw `new ApiException(status, { code?, message, details? })` to return a custom domain code (e.g. `POLICY_BLOCKED`). Use 401 unauthenticated, 403 forbidden action, 404 not found **or not owned** (never reveal existence of others' resources), 409 conflict/version mismatch.
- Unknown errors become `500 INTERNAL_ERROR` / `Internal server error`; the real cause is logged server-side only (never request bodies, tokens or bound values).

## Swagger

- Swagger metadata lives in `<feature>.swagger.ts` next to the controller, never inline. Export one composed decorator per handler (`applyDecorators(ApiOperation, ApiOkResponse/ApiCreatedResponse, ...)`, e.g. `ApiListResearch()`) and one class-level decorator (`ApiResearchController()`) that applies `@ApiTags('<feature>')` and `@ApiBearerAuth()` (omitted for `@Public()` controllers).
- The controller shows only routing, pipes and delegation: one composed Swagger decorator per handler, no raw `@Api*` decorators.
- Generate schema docs from the Zod contracts (e.g. `zod` → JSON schema helper) instead of duplicating DTO classes for Swagger.
