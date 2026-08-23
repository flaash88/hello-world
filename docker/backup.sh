#!/bin/sh
# Naechtliches pg_dump in ein Volume, Aufbewahrung standardmaessig 14 Tage.
# Laeuft als eigener Sidecar-Container ohne cron-Daemon.
set -e

RETENTION="${BACKUP_RETENTION_DAYS:-14}"
HOUR="${BACKUP_HOUR:-3}"
DIR=/backups
# Wird von der App im Upload-Volume abgelegt (nur lesend eingebunden).
REQUEST="${BACKUP_REQUEST_FILE:-/data/uploads/.backup-request}"
STAMP_FILE="$DIR/.last-run"

mkdir -p "$DIR"

run_backup() {
  stamp=$(date +%Y%m%d-%H%M%S)
  file="$DIR/sproessling-$stamp.sql.gz"
  echo "[backup] Erstelle $file"
  if pg_dump --no-owner --no-privileges | gzip -9 > "$file.part"; then
    mv "$file.part" "$file"
    echo "[backup] Fertig: $(du -h "$file" | cut -f1)"
  else
    echo "[backup] FEHLGESCHLAGEN" >&2
    rm -f "$file.part"
    return 1
  fi
  find "$DIR" -name 'sproessling-*.sql.gz' -type f -mtime "+$RETENTION" -delete
  echo "[backup] Aeltere Sicherungen als $RETENTION Tage entfernt."
  date +%Y-%m-%dT%H:%M:%S > "$STAMP_FILE"
}

# Beim Start einmal sichern, danach minuetlich pruefen: Liegt eine Anforderung
# aus der App vor (Markierung neuer als der letzte Lauf), oder ist die
# taegliche Backup-Stunde erreicht?
run_backup || true
last_day=$(date +%Y-%m-%d)

while true; do
  sleep 60
  if [ -f "$REQUEST" ] && [ -n "$(find "$REQUEST" -newer "$STAMP_FILE" 2>/dev/null)" ]; then
    echo "[backup] Anforderung aus der App erkannt."
    run_backup || true
    last_day=$(date +%Y-%m-%d)
    continue
  fi
  today=$(date +%Y-%m-%d)
  if [ "$(date +%H)" = "$(printf '%02d' "$HOUR")" ] && [ "$today" != "$last_day" ]; then
    run_backup || true
    last_day="$today"
  fi
done
