#!/bin/sh
set -eu

checksum() {
  {
    find src scripts migrations -type f -exec stat -c '%Y %s %n' {} \;

    for file in package.json package-lock.json tsconfig.json tsconfig.build.json; do
      if [ -f "$file" ]; then
        stat -c '%Y %s %n' "$file"
      fi
    done
  } | sort | sha1sum
}

npm run db:migrate
npm run db:migrate:up

npm run start:dev &
app_pid="$!"
last_checksum="$(checksum)"

while kill -0 "$app_pid" 2>/dev/null; do
  sleep 2
  next_checksum="$(checksum)"

  if [ "$next_checksum" != "$last_checksum" ]; then
    echo "gaia-be change detected; restarting API container..."
    kill "$app_pid" 2>/dev/null || true
    wait "$app_pid" 2>/dev/null || true
    exit 0
  fi
done

wait "$app_pid"
