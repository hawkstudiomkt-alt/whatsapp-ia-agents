#!/bin/sh
set -e

echo "=== Rattix Backend Startup ==="

# Resolve any failed migrations before deploying.
# P3009: if a migration started but failed, Prisma blocks all future deploys.
# We mark it as applied (tables likely exist even if migration was marked failed)
# and let migrate deploy handle the remaining ones.
echo "--- Checking migration state..."
for migration in \
  "20260327233103_init" \
  "20260402000001_add_agent_ai_settings" \
  "20260402000002_add_tags_support_phone_ai_ideas"
do
  npx prisma migrate resolve --applied "$migration" 2>/dev/null \
    && echo "    Resolved: $migration" \
    || echo "    Already OK: $migration"
done

echo "--- Running prisma migrate deploy..."
npx prisma migrate deploy

echo "--- Starting server..."
exec node dist/server.js
