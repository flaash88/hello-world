# Sprössling

Self-hosted Schwangerschafts- und Baby-Tracker für zwei Personen.
Deutsch, Handy-first, offline-fähig, ohne Cloud und ohne Tracker.

## Was drin ist

Schwangerschaft (SSW-Verlauf, Wehen, Kindsbewegungen, Werte, Termine,
Kliniktasche, Namen), Tracker mit Timern und Offline-Queue, Schlafmodell und
24-Stunden-Kreisuhr, Auswertungen, Wachstum mit WHO-Perzentilen, Wochencontent
mit Sprüngen und Meilensteinen, Tagebuch mit Fotos und Tonspuren,
Einschlafgeräusche, Eltern-Tab, Wissensbereich (Ernährung, Lebensmittel-Check,
Geburtsvorbereitung, Behördenwege Österreich, Stillen, Wochenbett, Rezepte),
Vorsorge (Impfungen und Eltern-Kind-Pass), Zahnschema, Fieberverlauf mit
Arztzettel und Milchvorrat mit Etiketten.

> **Vorsorgedaten prüfen.** Impfplan und Eltern-Kind-Pass-Untersuchungen liegen
> als versionierte JSON-Dateien unter `content/vorsorge/`. Sie tragen derzeit
> `"geprueft": false` – die Termine stammen aus Zusammenfassungen der offiziellen
> Seiten, nicht aus den Originaldokumenten, und die App sagt das auch sichtbar.
> Gleicht sie vor der Verwendung gegen den Impfplan Österreich und den
> Eltern-Kind-Pass ab. Herkunft, Prüfstand und Prüfintervall stehen in
> `DECISIONS.md`.

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
# Cloudflare Tunnel einrichten (siehe unten – Ziel ist app:3000, nicht 127.0.0.1)
# https://<deine-domain>/register mit START-CODE öffnen und Konto anlegen
```

Der zweite Elternteil bekommt seinen Code danach in der App unter
**Mehr → Zweite Person einladen**.

## Zugriff von außen (Cloudflare Tunnel)

Die App bindet bewusst nur auf `127.0.0.1:3000` – erreichbar wird sie über einen
Tunnel, nicht über einen offenen Port.

**Variante A – Tunnel als Container (empfohlen, alles in einem Compose):**

Wichtig: Ziel ist `app:3000`. `127.0.0.1` wäre aus Sicht des cloudflared-Containers
er selbst – dort lauscht nichts.

```bash
# Cloudflare Zero Trust -> Networks -> Tunnels -> Create tunnel -> Token kopieren
echo 'CLOUDFLARE_TUNNEL_TOKEN="<token>"' >> .env
# Im Tunnel als Public Hostname eintragen:
#   sproessling.example.org  ->  HTTP  ->  app:3000
docker compose --profile tunnel up -d
```

**Variante B – `cloudflared` läuft direkt im LXC:** Ingress-Ziel ist dann
`http://127.0.0.1:3000` statt `app:3000`, der Rest ist identisch.

Danach:

- `APP_URL` in der `.env` auf die öffentliche Adresse setzen (`https://…`) und
  `docker compose up -d` – daraus baut der ntfy-Weg seine Links.
- Die Session-Cookies laufen in Produktion mit `Secure`; über den Tunnel gibt es
  ohnehin HTTPS. Nur für einen reinen LAN-Betrieb ohne TLS `COOKIE_SECURE=false`.
- Auf dem Handy die Seite in Chrome bzw. Safari öffnen und **zum Startbildschirm
  hinzufügen** – erst als installierte PWA gibt es Web Push (auf iOS zwingend).
- Wer die App zusätzlich abschotten will, legt in Cloudflare Access eine Policy
  auf den Hostnamen. `/api/health` sollte dabei ausgenommen bleiben.
- Die Live-Aktualisierung läuft über SSE. Der Tunnel schließt Verbindungen nach
  100 Sekunden Stille, deshalb sendet `/api/realtime` alle 25 Sekunden ein Ping –
  dazu braucht es keine Einstellung, es ist nur der Grund, warum es funktioniert.

## Betrieb

- **Healthcheck:** `GET /api/health` prüft App und Datenbank.
- **Backups:** Der `backup`-Container legt jede Nacht ein `pg_dump` im Volume
  `backups` ab (Aufbewahrung `BACKUP_RETENTION_DAYS`, Standard 14 Tage). Unter
  **Mehr → Backup & Daten** siehst du die vorhandenen Sicherungen und kannst
  eine sofort anfordern: Die App legt dafür eine Markierung im Upload-Volume
  ab, die der Sidecar innerhalb einer Minute aufgreift. Die App selbst hat
  keinen Schreibzugriff auf das Backup-Volume und kein `pg_dump`.
- **Restore:**
  ```bash
  docker compose stop app cron
  docker compose exec -T postgres psql -U sproessling -d postgres \
    -c 'DROP DATABASE sproessling WITH (FORCE);' -c 'CREATE DATABASE sproessling;'
  docker compose run --rm -T backup sh -c \
    'gunzip -c /backups/sproessling-<stamp>.sql.gz | psql'
  docker compose start app cron
  ```
  Dieselbe Anleitung steht in der App unter **Mehr → Backup & Daten**.
- **Migrationen** laufen beim Start des App-Containers (`prisma migrate deploy`).
  Die CLI dafür liegt im Image unter `/opt/prisma-cli`; hängt der Container in
  einer Restart-Schleife, zeigt `docker compose logs app`, an welcher der drei
  Startschritte es klemmt.
- **Update:** `git pull && docker compose up -d --build` – Migrationen laufen
  beim Start automatisch (`prisma migrate deploy`).
- **Uploads** liegen im Volume `uploads` und sind Teil des Backups nur, wenn du
  das Volume separat sicherst (`docker run --rm -v sproessling_uploads:/u ...`).
  Das gilt auch für Fotos und Tonaufnahmen: im JSON-Backup steht nur, welche es
  gab, die Dateien selbst liegen im Volume.
- **ffmpeg** steckt im Image und wandelt die Aufnahmen aus dem Tonspur-Tagebuch
  nach Opus um. Liegt es woanders, zeigen `FFMPEG_PATH` und `FFPROBE_PATH`
  darauf. Fehlt es, sagt `/tagebuch/toene` das offen, statt still zu scheitern.
- **QR-Codes auf den Milch-Etiketten** brauchen `APP_URL`; ohne die öffentliche
  Adresse druckt die App keinen Code statt einen, der ins Leere führt.

## Entwicklung

```bash
npm install
cp .env.example .env       # DATABASE_URL auf lokale Postgres zeigen lassen
npm run db:migrate
npm run db:seed
npm run dev
```

`npm run check` führt Lint, Typecheck und Unit-Tests aus. Für `npm run test:e2e`
braucht es vorher `npm run build`; in Umgebungen mit vorinstalliertem Chromium
zeigt `PLAYWRIGHT_CHROMIUM_PATH` auf den Browser. Für die Tests des
Tonspur-Tagebuchs muss `ffmpeg` lokal installiert sein.

## Hinweis

Sprössling ist ein Logbuch, kein medizinisches Gerät. Alle Auswertungen sind
eine Orientierung und ersetzen weder Hebamme noch Ärztin.
