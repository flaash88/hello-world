# Fortschritt

Ein Block pro Phase, maximal zehn Zeilen.

## Phase 0 – Grundgerüst (abgeschlossen)

- Next.js 15.5 + TypeScript strict, Tailwind 3, shadcn-Bausteine im Repo, Fonts self-hosted.
- Prisma-Schema für alle Phasen (30 Modelle) inkl. Initial-Migration und Seed.
- Auth: argon2id, DB-Sessions (nur gehasht), Einladungscode-Pflicht, CSRF, Rate-Limit in Postgres.
- Realtime-Grundlage: `pg_notify` → Hub → SSE (`/api/realtime`) mit Reconnect-Backoff.
- PWA: Serwist-SW mit Offline-Fallback und Push-Handler, Manifest, Icons, Install-Hinweis.
- Nachtmodus als eigenes Token-Set (`data-theme="night"`), automatisch 20:00–06:00.
- Betrieb: Multi-Stage-Dockerfile, docker-compose (app + postgres + backup), Healthcheck, CI.
- Grün: `lint`, `typecheck`, 31 Unit-Tests, 4 E2E-Tests (Registrierung/Anmeldung), `build`.

## Phase 1 – Schwangerschaft (abgeschlossen)

- SSW-Rechnung aus dem ET (Nägele), Trimester, Fortschritt – DST-sicher, 22 Unit-Tests.
- Wochencontent SSW 4–42, selbst formuliert: Größe/Gewicht, Vergleichsobst, Baby, Mama, Partnertipp.
- Übersicht mit Countdown-Ring (reines SVG, kein Chart-Paket) und Wochen-Browser.
- Wehen-Timer mit 4-1-1-Auswertung in drei Teilbedingungen, Verlauf, Löschen.
- 10-Bewegungen-Zählung mit Sitzungslogik (2-Stunden-Fenster) und Historie.
- Mutter-Werte: Gewicht, Blutdruck, Puls, Symptomauswahl, Notiz, zwei Verlaufsdiagramme.
- Mutter-Kind-Pass: 15 Termine mit SSW-Fenster vorbelegt, eigene Termine ergänzbar.
- Kliniktasche: 46 Einträge in 6 Abschnitten, abhakbar mit Zuschreibung, erweiterbar.
- Namensliste mit blindem Voting und Treffer-Ansicht.
- Grün: lint, typecheck, 65 Unit-Tests, 11 E2E-Tests, build.

## Phase 2 – Tracker (abgeschlossen)

- Polymorpher Event-Typ mit zod-Schema je Art; neun Tracker (Schlaf, Stillen, Flasche,
  Abpumpen, Beikost, Windel, Stimmung, Gesundheit, Sonstiges) inkl. aller Detailfelder.
- Timer serverseitig: Start/Pause/Fortsetzen/Stopp überleben Reload, App-Kill und Gerätewechsel.
- Sticky Timer-Leiste über der Tab-Navigation, sichtbar auf jeder Seite.
- Schnellaktionen: Ein-Tap-Start für Schlaf/Stillen/Abpumpen, alles andere zwei Taps.
- Offline: IndexedDB-Queue mit Idempotenz, Sammel-Endpunkt `/api/sync`, Statusleiste, Retry.
- Realtime: Änderungen des Partners erscheinen ohne Neuladen (per E2E mit zwei Browsern geprüft).
- Alles editierbar und löschbar mit „Rückgängig“; jede Änderung landet in `EventRevision`.
- Beikost-Autocomplete aus bisherigen Einträgen; Stillseiten-Vorschlag aus dem letzten Mal.
- Grün: lint, typecheck, 99 Unit-Tests, 21 E2E-Tests (inkl. Offline und Zwei-Personen-Sync), build.

## Phase 3 – Schlaf-Algorithmus (abgeschlossen)

- Wachfenster-Tabelle 0–3 Jahre mit Quellenangabe, altersinterpoliert (kein Sprung am Geburtstag).
- Adaptives Modell: gleitender Median der letzten 14 Tage, IQR-gefiltert, gewichtet gegen die Tabelle.
- Ehrlicher „Kalibriert noch“-Zustand unter fünf Messungen – keine erfundene Uhrzeit.
- Vorhersage als Zeitfenster mit Konfidenz; Unterscheidung Nickerchen/Bettzeit aus gemessener Bettzeit.
- Schlafdruck-Ring seit dem letzten Aufwachen, inkl. Übermüdungs-Überlauf.
- 24h-Kreisuhr mit vier Ringen, geplantem Fenster als Schraffur, antippbar und wischbar.
- Tagesziel: Gesamtschlaf und Nickerchenzahl gegen die Altersempfehlung.
- Web Push (VAPID) mit Kategorien, Ruhezeiten, Probenachricht; optional ntfy; Cron-Sidecar.
- Grün: lint, typecheck, 154 Unit-Tests (davon 55 zum Schlafmodell), 26 E2E-Tests, build.

## Phase 4 – Statistiken, Wachstum, Export (abgeschlossen)

- Echte WHO-LMS-Tabellen als JSON im Repo (0–5 Jahre, Tagesauflösung, 4 Indikatoren, beide Geschlechter).
- Eigene LMS-Rechnung, gegen offizielle Referenzwerte getestet; Perzentilkurven P3–P97.
- Wachstumsseite mit Kurven, eigenen Punkten, korrigiertem Alter bei Frühgeburt.
- Statistiken für Tag/Woche/Monat: Schlaf, Fütterung, Windeln, Trendlinien, Tagesverteilung.
- Schlaf-Heatmap über 30 Tage (Zeile = Tag, Spalte = Stunde).
- Automatischer Wochenrückblick, beschreibend statt bewertend, für beide gleich.
- Export: CSV je Kategorie (Semikolon, Dezimalkomma, BOM), JSON-Backup ohne Zugangsdaten, PDF-Wochenbericht.
- Ein Locale-Fehler wurde durch die Tests gefunden: `de-AT` hängt bei Stunden " Uhr" an.
- Grün: lint, typecheck, 259 Unit-Tests (95,6 % Coverage auf der Logik), 36 E2E-Tests, build.

## Phase 5 – Content und Entwicklung (abgeschlossen)

- 77 Content-Einträge als Markdown: Woche 0–52 wöchentlich, danach monatsweise (Monat 13–36).
- Je Eintrag acht Abschnitte: Körper, Motorik, Sprache, Sozial, Schlaf, Ernährung, Achtung, Elterntipp.
- Sprungkalender mit zehn Fenstern, Anzeichen und Gewinnen – samt Einordnung der Datenlage.
- 236 Entwicklungsübungen mit Ziel, Material, 3–5 Schritten und Dauer, lückenlos für Woche 0–156.
- Übung des Tages, deterministisch aus Alter und Datum, überspringt bereits Gemachtes.
- 69 kuratierte Meilensteine in sechs Kategorien, abhakbar, plus eigene Meilensteine.
- „Beim nächsten Termin ansprechen“ für überfällige Meilensteine mit Warngrenze.
- Dynamische Tab-Leiste mit höchstens fünf Zielen, je nach Schwangerschaft und Kind.
- Grün: lint, typecheck, 290 Unit-Tests, 43 E2E-Tests, build.

## Phase 6 – Tagebuch, Fotos, Sounds (abgeschlossen)

- Tagebuch mit Text, mehreren Fotos, Datum, Schlagwörtern und Stimmung; Zeitleiste mit Filtern.
- Foto-Upload lokal auf Platte, Neukodierung nach WebP mit Thumbnail, EXIF vollständig entfernt.
- Aufnahmedatum aus EXIF wird als Datumsvorschlag übernommen, bevor die Daten verworfen werden.
- Bilder nur für angemeldete Mitglieder des Haushalts abrufbar (E2E-geprüft: 401 ohne Anmeldung).
- Dateitypprüfung anhand des Inhalts; getarnte Nicht-Bilder werden abgelehnt.
- Monatsfoto-Serie als Galerie mit Lücken für fehlende Monate.
- Jahresrückblick mit Zahlen, Meilensteinen und Einträgen, druckbar über den Browser.
- Neun Einschlafgeräusche, vollständig per Web Audio API erzeugt, mit Timer, Fade-Out,
  Lautstärke, Favoriten und MediaSession für den Sperrbildschirm.
- Grün: lint, typecheck, 296 Unit-Tests, 49 E2E-Tests, build.

## Phase 7 – Eltern, Einstellungen, Betrieb (abgeschlossen)

- Eltern-Tab: Check-in mit drei Reglern, eigener Schlaf, Verlauf gegen die Nächte des Kindes.
- Nachtschicht mit Übergabe-Notiz für beide sichtbar; privates Tagebuch nur für die eigene Person.
- Hinweis auf Hilfe erst bei Häufung über Tage, danach sieben Tage Ruhe; AT-Kontakte als tel:-Links.
- Einheiten (kg/lb, cm/in, °C/°F, ml/oz) als reine Anzeigeschicht – gespeichert bleibt metrisch.
- Kindprofil mit Geburtsdatum, ET für das korrigierte Alter, Geschlecht und Geschwisterwechsel.
- Startbildschirm und Schnellaktionen wählbar; `/` leitet weiter, Dashboard liegt auf `/heute`.
- Backup-Seite: vorhandene Dumps, „jetzt sichern“ über Markierungsdatei, Restore-Anleitung.
- Haushalt samt beider Konten löschbar – mit Passwort, Bestätigungswort und Export daneben.
- Grün: lint, typecheck, 335 Unit-Tests (96,9 % Coverage auf der Logik), 57 E2E-Tests, build.
