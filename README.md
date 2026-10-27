# Gaia Backend

NestJS 11 API for Gaia. Authentication is delegated to Supabase (proxied by this backend); persistence uses Sequelize over Postgres.

## Prerequisites

- `@moderta/api-contracts` (>= 0.3.10, `@moderta/api-contracts/gaia`) must be **published** before `npm ci` or the Docker build can work. After it is published, run `npm install` once and commit the updated `package-lock.json`. Until then, install it locally with `npm install --no-save` from a packed copy of `../esm-common-modules` (never commit a `file:` dependency).
- A Supabase project (shared with the ESM product) and a Postgres database.

## Setup

1. Create `.env` from `.env.example` and fill in the Supabase keys and `DB_*` values. Env is validated with Zod at boot; the app refuses to start with a readable error if something is missing. `NODE_ENV` defaults to `production`, where `FRONTEND_URL` is required. `SUPABASE_SERVICE_ROLE_KEY` must stay server-side.
2. Install and run:

```bash
npm ci
npm run db:migrate   # legacy SQL migrations in migrations/
npm run start:dev
```

Other checks: `npm run lint`, `npm run build`.

## Authentication

Users live in Supabase. Gaia roles are stored in the server-controlled `app_metadata.gaia` (`{ roles, abilities? }`), never in `user_metadata`. Because the Supabase project is shared with ESM, any account **without** `app_metadata.gaia` (or with an empty `roles`) is rejected with 403 at login, refresh and on every request. New Gaia accounts get the default role at signup.

A global guard authenticates every route (send `Authorization: Bearer <accessToken>`); routes marked `@Public()` are open. A second global guard enforces `@Roles(...)` when present.

## API

All responses use one envelope. Success:
`{ "success": true, "statusCode": 200, "message": "OK", "data": ..., "timestamp": "...", "path": "/..." }`.
Errors: `{ "success": false, "statusCode": 400, "message": "...", "errors"?: { field: ["..."] }, "timestamp": "...", "path": "/..." }`
(`errors` appears for validation failures only). See `.ai/instructions/api-conventions.md`.

| Method and path | Auth | Body | Result (`data`) |
|---|---|---|---|
| `GET /health` | public | - | `{ status }` |
| `POST /auth/signup` | public | `{ email, password, name }` | 201, `AuthSession` |
| `POST /auth/login` | public | `{ email, password }` | `AuthSession` (401 invalid credentials, 403 no Gaia access) |
| `POST /auth/refresh` | public | `{ refreshToken }` | `AuthSession` |
| `POST /auth/logout` | Bearer | - | `{ message }` (revokes this session) |
| `GET /auth/me` | Bearer | - | `AuthUser` |
| `POST /auth/forgot-password` | public | `{ email }` | `{ message }` (same message whether or not the email exists) |
| `POST /auth/reset-password` | Bearer = recovery token | `{ password }` | `{ message }` (403 unless the token is a recovery session; ends all sessions) |

Request and response shapes come from `@moderta/api-contracts/gaia`. The reset link sent by Supabase points to `FRONTEND_URL/auth/reset-password`.

## Docker

```bash
docker compose up --build
```

- `postgres` (16-alpine) is configured from `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` and published on `DB_PORT` (default 5432).
- `api` reads `.env` at runtime (it is not baked into the image), overrides `DB_HOST=postgres`, `DB_PORT=5432` and `NODE_ENV=development`, waits for Postgres, runs `npm run db:migrate`, then starts under a file watcher. It is available at `http://localhost:${API_PORT:-3001}`.
- The image build needs `@moderta/api-contracts` to be published (see Prerequisites).

`src`, `scripts`, `migrations` and the TypeScript config files are bind-mounted. The watcher exits the container when they change and Docker restarts it (`restart: unless-stopped`). After dependency changes, rebuild with `docker compose up --build`.

Different host ports: `API_PORT=3002 DB_PORT=55433 docker compose up --build`.

## Legacy

`migrations/*.sql` (applied by `npm run db:migrate`) and `npm run account:create` (writes the old `app_users` table; no longer used by the app) are kept until retired. The old `db:seed:init` script was removed because it read the deleted `src/init/init-data.json`.
