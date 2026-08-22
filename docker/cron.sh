#!/bin/sh
# Ruft alle fuenf Minuten den Erinnerungs-Endpunkt der App auf.
# Bewusst als schlanker Sidecar ohne cron-Daemon.
set -e

INTERVAL="${CRON_INTERVAL_SEC:-300}"
URL="${APP_INTERNAL_URL:-http://app:3000}/api/cron/reminders"

if [ -z "$CRON_SECRET" ]; then
  echo "[cron] CRON_SECRET fehlt – Erinnerungen sind deaktiviert." >&2
  exit 0
fi

echo "[cron] Starte, Intervall ${INTERVAL}s, Ziel $URL"
while true; do
  sleep "$INTERVAL"
  if ! wget --quiet --output-document=- --post-data='' \
      --header="x-cron-secret: $CRON_SECRET" "$URL" > /dev/null 2>&1; then
    echo "[cron] Aufruf fehlgeschlagen – nächster Versuch in ${INTERVAL}s." >&2
  fi
done
