#!/bin/sh
set -e

echo "[sproessling] Warte auf die Datenbank ..."
for i in $(seq 1 60); do
  if node -e "
    const { Client } = require('pg');
    const c = new Client({ connectionString: process.env.DATABASE_URL });
    c.connect().then(() => c.end()).then(() => process.exit(0)).catch(() => process.exit(1));
  " 2>/dev/null; then
    break
  fi
  if [ "$i" = "60" ]; then
    echo "[sproessling] Datenbank nicht erreichbar – Abbruch." >&2
    exit 1
  fi
  sleep 2
done

echo "[sproessling] Migrationen einspielen ..."
./node_modules/.bin/prisma migrate deploy

if [ -n "$BOOTSTRAP_INVITE_CODE" ]; then
  echo "[sproessling] Haushalt und Einladungscode sicherstellen ..."
  node docker/seed.mjs
fi

echo "[sproessling] Start."
exec "$@"
