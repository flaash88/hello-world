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
Arztzettel und Milchvorrat mit Etiketten. Für die ersten Wochen: Gewichtsverlauf
ab dem Geburtsgewicht, Stillprotokoll für die Hebamme und eine Notfallkarte, die
auch ohne Netz steht. Dazu Doppelerfassungs-Erkennung für den Zwei-Personen-
Betrieb, PWA-Verknüpfungen samt Share Target und eine REST-Schnittstelle für
Home Assistant (siehe `docs/homeassistant.md`).

> **Das meiste davon ist ab Werk aus.** Sprössling startet im Modus „Nur
> Protokoll": eintragen, nachlesen, ausdrucken. Schlafrhythmus und Vorhersage,
> die 24-Stunden-Kreisuhr, alle Auswertungen, die Entwicklungsinhalte, die
> WHO-Perzentilkurven und der Eltern-Check-in sind abgeschaltet, ebenso alle
> Benachrichtigungen außer den Eltern-Kind-Pass-Fristen. Das ist Absicht: eine
> Tracking-App, die im Wochenbett Vorgaben macht, richtet mehr Schaden an als
> ihr Nutzen wert ist. Einschalten lässt sich alles einzeln unter
> **Mehr → Was die App anzeigt**, und genauso einfach wieder ab. Abgeschaltete
> Bereiche verschwinden vollständig – es gibt keine graue Kachel, die daran
> erinnert. Eure Daten bleiben in jedem Fall erhalten.

> **Vorsorgedaten prüfen.** Impfplan und Eltern-Kind-Pass-Untersuchungen liegen
> als versionierte JSON-Dateien unter `content/vorsorge/`. Sie tragen derzeit
> `"geprueft": false` – die Termine stammen aus Zusammenfassungen der offiziellen
> Seiten, nicht aus den Originaldokumenten, und die App sagt das auch sichtbar.
> Gleicht sie vor der Verwendung gegen den Impfplan Österreich und den
> Eltern-Kind-Pass ab. Herkunft, Prüfstand und Prüfintervall stehen in
> `DECISIONS.md`.

## Setup auf einer frischen VM

Geschrieben für Debian 12 und Ubuntu 24.04. Andere Distributionen gehen auch,
dann weicht nur Schritt 2 ab.

**Was die VM braucht:** 2 vCPU, 4 GB RAM, 20 GB Platte. Der Next-Build ist der
hungrigste Moment – mit 2 GB RAM klappt er nur mit Swap. Danach reicht deutlich
weniger.

**Was du sonst brauchst:** eine Domain bei Cloudflare (für den Tunnel) und ein
paar Minuten.

### 1. System vorbereiten

```bash
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl git

# Zeitzone setzen – die App rechnet in Europe/Vienna, der Host sollte mitziehen.
sudo timedatectl set-timezone Europe/Vienna

# Sicherheitsupdates automatisch einspielen (die VM hängt am Internet).
sudo apt-get install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

Node.js brauchst du **nicht** auf dem Host – alles läuft in Containern.

### 2. Docker installieren

Nicht `apt install docker.io` nehmen: das ist meist zu alt und bringt
`docker compose` nicht mit. Das offizielle Repository von Docker:

```bash
sudo install -m 0755 -d /etc/apt/keyrings
. /etc/os-release   # setzt ID (debian|ubuntu) und VERSION_CODENAME

sudo curl -fsSL "https://download.docker.com/linux/$ID/gpg" \
  -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/$ID $VERSION_CODENAME stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin

sudo systemctl enable --now docker
```

Damit du nicht bei jedem Befehl `sudo` brauchst:

```bash
sudo usermod -aG docker "$USER"
newgrp docker            # oder einmal ab- und wieder anmelden
docker compose version   # muss v2.x zeigen
```

### 3. Sprössling holen und konfigurieren

```bash
git clone <repo> sproessling && cd sproessling
git checkout claude/sprossling-baby-tracker-sv49bu
cp .env.example .env
```

Ein kleiner Helfer, damit die Werte sauber in die `.env` kommen:

```bash
setenv() {
  if grep -q "^$1=" .env; then
    sed -i "s|^$1=.*|$1=\"$2\"|" .env
  else
    printf '%s="%s"\n' "$1" "$2" >> .env
  fi
}
```

Geheimnisse erzeugen:

```bash
setenv SESSION_SECRET "$(openssl rand -base64 48)"
setenv CRON_SECRET    "$(openssl rand -hex 32)"
# Hex, nicht base64: das Passwort landet in einer URL, und "/" oder "+" darin
# zerlegen die Verbindungszeichenkette.
setenv POSTGRES_PASSWORD "$(openssl rand -hex 24)"
setenv BOOTSTRAP_INVITE_CODE "START-CODE"
setenv APP_URL "https://sproessling.example.org"   # deine spätere Adresse
```

VAPID-Schlüssel für Web Push – dafür reicht ein Wegwerf-Container:

```bash
docker run --rm node:22-alpine npx --yes web-push generate-vapid-keys
```

Die beiden Ausgaben eintragen:

```bash
setenv NEXT_PUBLIC_VAPID_PUBLIC_KEY "<Public Key>"
setenv VAPID_PRIVATE_KEY            "<Private Key>"
setenv VAPID_SUBJECT                "mailto:du@example.org"
```

Kurz gegenlesen, ob nichts Wichtiges mehr auf `CHANGE_ME` steht:

```bash
grep CHANGE_ME .env | grep -v '^DATABASE_URL='   # darf nichts ausgeben
```

`DATABASE_URL` bleibt absichtlich auf dem Platzhalter stehen: im
Compose-Betrieb setzt `docker-compose.yml` sie selbst aus Benutzer, Passwort und
Containername zusammen. Gebraucht wird die Zeile nur, wenn du die App ohne
Docker gegen eine eigene Postgres laufen lässt.

### 4. Starten und prüfen

```bash
docker compose up -d --build      # dauert beim ersten Mal ein paar Minuten
docker compose ps                 # app muss "healthy" sein
curl -f http://127.0.0.1:3000/api/health   # {"status":"ok"}
```

Wenn `app` in einer Restart-Schleife hängt, sagt `docker compose logs app`, an
welchem der drei Startschritte (Datenbank abwarten → migrieren → seeden) es
klemmt.

### 5. Von außen erreichbar machen

Die App bindet bewusst nur auf `127.0.0.1:3000`. Nach außen geht es über den
Cloudflare Tunnel – siehe den nächsten Abschnitt. **Öffne keinen Port 3000 in
der Firewall.**

Danach `https://<deine-domain>/register` mit `START-CODE` öffnen und das erste
Konto anlegen. Den Code für den zweiten Elternteil erzeugt die App unter
**Mehr → Zweite Person einladen**.

Zum Schluss den Bootstrap-Code entwerten, damit er nicht offen herumliegt:

```bash
setenv BOOTSTRAP_INVITE_CODE ""
docker compose up -d
```

### Wenn Docker schon läuft

```bash
git clone <repo> sproessling && cd sproessling
cp .env.example .env
# Schritt 3 von oben (setenv-Block), dann:
docker compose up -d --build
curl -f http://127.0.0.1:3000/api/health
```

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
- **Automationen:** Unter **Mehr → Automationen & API** entstehen Tokens für
  Home Assistant und NFC-Tags. Sie gelten für einen Haushalt und eine Person,
  sind einzeln widerrufbar und stehen nur einmal im Klartext da. Die Anleitung
  mit fertigen Snippets liegt in `docs/homeassistant.md`.
- **Drucken:** Stillprotokoll und Arzt-Zettel sind auf A4 hochkant ausgelegt,
  schwarzweiß und ohne Navigation. Über das Browser-Menü drucken oder als PDF
  herunterladen.
- **Umfang der App:** Unter **Mehr → Was die App anzeigt** liegen drei Stufen
  („Nur Protokoll", „Erweitert", „Alles") und darunter ein Schalter je Bereich –
  wer nur die Tagesuhr will, schaltet nur die ein. Dieselbe Seite hat „App auf
  Protokollmodus zurücksetzen" (schaltet alles Zusätzliche ab, ohne Daten zu
  löschen) und eine **Pause** für einen Tag bis einen Monat, die alles außer
  Stillen, Flasche, Windel und Schlaf ausblendet und danach von selbst endet.
  Der Zustand gilt für den ganzen Haushalt, nicht je Gerät.
- **Benachrichtigungen** sind ab Werk aus, bis auf die Fristen im
  Eltern-Kind-Pass. Was es überhaupt geben kann, steht unter
  **Mehr → Benachrichtigungen**: Schlaffenster, Medikamenten-Intervall,
  Milchvorrat und Nachtschicht-Übergabe. Aufforderungen, etwas einzutragen, und
  Wochenrückblicke gibt es nicht – die stehen nicht in der Erlaubnisliste in
  `src/lib/push/kategorien.ts` und lassen sich auch nicht einschalten. Die
  Ruhezeit gilt für alles, auch für Termine.

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
