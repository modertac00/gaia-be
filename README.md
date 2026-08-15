# Gaia Backend

NestJS API for Gaia authentication backed by Postgres.

## Setup

1. Create `.env` from `.env.example`.
2. Run migrations:

```bash
npm run db:migrate
```

3. Create the single backend-owned account:

```bash
npm run account:create
```

There is no public account-creation endpoint. The database migration adds a trigger that prevents more than one account from existing.

## API

- `GET /health`
- `POST /auth/login`
- `GET /auth/me`

## Docker

Start the API and Postgres together:

```bash
docker compose up --build
```

The API is available at `http://localhost:3001` and Postgres is available at
`localhost:55432`. The API container runs `npm run db:migrate` before starting.

Create the single backend-owned account inside the running API container:

```bash
docker compose exec \
  -e ACCOUNT_EMAIL=admin@gaia.local \
  -e ACCOUNT_PASSWORD=change-me-123 \
  -e ACCOUNT_NAME="Gaia Admin" \
  api npm run account:create
```

Use `API_PORT` or `POSTGRES_PORT` if you need different host ports:

```bash
API_PORT=3002 POSTGRES_PORT=55433 docker compose up --build
```
