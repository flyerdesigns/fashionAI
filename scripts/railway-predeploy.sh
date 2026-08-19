#!/usr/bin/env sh
set -e

if [ "${RAILWAY_SERVICE_NAME:-}" = "fashionai-staging-web" ]; then
  npx prisma migrate deploy
  npm run seed:playwright
fi
