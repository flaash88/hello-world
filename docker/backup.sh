#!/bin/sh
# Naechtliches pg_dump in ein Volume, Aufbewahrung standardmaessig 14 Tage.
# Laeuft als eigener Sidecar-Container ohne cron-Daemon.
set -e

RETENTION="${BACKUP_RETENTION_DAYS:-14}"
HOUR="${BACKUP_HOUR:-3}"
DIR=/backups

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
}

# Beim Start einmal sichern, danach taeglich zur eingestellten Stunde.
run_backup || true

while true; do
  now_h=$(date +%H)
  now_m=$(date +%M)
  # Sekunden bis zur naechsten vollen Backup-Stunde.
  target=$(( (24 + HOUR - now_h) % 24 ))
  if [ "$target" = "0" ]; then target=24; fi
  sleep $(( target * 3600 - now_m * 60 ))
  run_backup || true
done
