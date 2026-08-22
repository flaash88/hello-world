# Sprössling

Self-hosted Schwangerschafts- und Baby-Tracker für zwei Personen.
Deutsch, Handy-first, offline-fähig, ohne Cloud und ohne Tracker.

## Setup in 10 Zeilen

```bash
git clone <repo> sproessling && cd sproessling
cp .env.example .env
openssl rand -base64 48                      # -> SESSION_SECRET in .env
npx web-push generate-vapid-keys             # -> VAPID-Schlüssel in .env
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24)" >> .env
sed -i 's/^BOOTSTRAP_INVITE_CODE=.*/BOOTSTRAP_INVITE_CODE="START-CODE"/' .env
docker compose up -d --build                 # App, Postgres, Backup-Sidecar
curl -f http://127.0.0.1:3000/api/health     # {"status":"ok"}
# Cloudflare Tunnel auf 127.0.0.1:3000 zeigen lassen
# https://<deine-domain>/register mit START-CODE öffnen und Konto anlegen
```

Der zweite Elternteil bekommt seinen Code danach in der App unter
**Mehr → Zweite Person einladen**.

## Betrieb

- **Healthcheck:** `GET /api/health` prüft App und Datenbank.
- **Backups:** Der `backup`-Container legt jede Nacht ein `pg_dump` im Volume
  `backups` ab (Aufbewahrung `BACKUP_RETENTION_DAYS`, Standard 14 Tage).
- **Restore:**
  ```bash
  docker compose stop app
  docker compose exec -T postgres psql -U sproessling -d postgres \
    -c 'DROP DATABASE sproessling;' -c 'CREATE DATABASE sproessling;'
  gunzip -c backups/sproessling-<stamp>.sql.gz | \
    docker compose exec -T postgres psql -U sproessling -d sproessling
  docker compose start app
  ```
- **Update:** `git pull && docker compose up -d --build` – Migrationen laufen
  beim Start automatisch (`prisma migrate deploy`).
- **Uploads** liegen im Volume `uploads` und sind Teil des Backups nur, wenn du
  das Volume separat sicherst (`docker run --rm -v sproessling_uploads:/u ...`).

## Entwicklung

```bash
npm install
cp .env.example .env       # DATABASE_URL auf lokale Postgres zeigen lassen
npm run db:migrate
npm run db:seed
npm run dev
```

`npm run check` führt Lint, Typecheck und Unit-Tests aus.

## Hinweis

Sprössling ist ein Logbuch, kein medizinisches Gerät. Alle Auswertungen sind
eine Orientierung und ersetzen weder Hebamme noch Ärztin.
