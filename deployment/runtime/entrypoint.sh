#!/bin/sh
set -eu
if [ -z "${DATABASE_URL:-}" ]; then
  : "${DB_HOST:?DB_HOST must be set}"
  : "${DB_NAME:?DB_NAME must be set}"
  : "${DB_USER:?DB_USER must be set}"
  : "${DB_PASSWORD:?DB_PASSWORD must be injected by ECS Secrets Manager}"
  export DATABASE_URL="$(node -e 'const e=process.env;const u=new URL("postgresql://"+e.DB_HOST);u.username=e.DB_USER;u.password=e.DB_PASSWORD;u.port=e.DB_PORT||"5432";u.pathname="/"+encodeURIComponent(e.DB_NAME);u.searchParams.set("sslmode","verify-full");u.searchParams.set("sslrootcert","/app/certs/rds-global-bundle.pem");process.stdout.write(u.toString())')"
fi
unset DB_PASSWORD
exec "$@"
