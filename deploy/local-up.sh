#!/usr/bin/env bash
# Build the production image and run it locally on http://localhost:8088.
# First run generates deploy/.env.local with fresh secrets and prints the admin password once.
set -euo pipefail
cd "$(dirname "$0")"
umask 077

# Fall back to the default engine when the Docker Desktop context is not running.
if ! docker info >/dev/null 2>&1; then export DOCKER_CONTEXT=default; fi

COMPOSE=(docker compose -f docker-compose.local.yml)

if [[ ! -f .env.local ]]; then
  pw="$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-20)"
  cat > .env.local <<ENV
DATA_DIR=/data
ADDR=:8080
ADMIN_USERNAME=admin
ADMIN_PASSWORD=${pw}
SESSION_SECRET=$(openssl rand -base64 48)
TOTP_ENC_KEY=$(openssl rand -base64 32)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
ENV
  echo "Created deploy/.env.local — admin login: admin / ${pw}"
  echo "(only used on the first start; keep .env.local: it holds the TOTP encryption key)"
fi

"${COMPOSE[@]}" build
# Migrate the schema, seed the portfolio projects and create the first admin (idempotent).
"${COMPOSE[@]}" run --rm --no-deps app migrate
"${COMPOSE[@]}" up -d

for _ in $(seq 1 30); do
  if curl -fsS http://localhost:8088/healthz >/dev/null 2>&1; then
    echo "Up: http://localhost:8088  (admin: http://localhost:8088/admin/login)"
    exit 0
  fi
  sleep 1
done
echo "app did not become healthy; see: ${COMPOSE[*]} logs app" >&2
exit 1
