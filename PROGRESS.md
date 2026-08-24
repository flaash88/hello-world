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

- Eltern-Tab in der Tab-Leiste: Check-in mit drei Reglern, eigener Schlaf, Verlauf gegen die Nächte.
- Nachtschicht mit Übergabe-Notiz für beide sichtbar; privates Tagebuch nur für die eigene Person.
- Hinweis auf Hilfe erst bei Häufung über Tage, danach sieben Tage Ruhe; AT-Kontakte als tel:-Links.
- Einheiten (kg/lb, cm/in, °C/°F, ml/oz) als reine Anzeigeschicht – gespeichert bleibt metrisch.
- Kindprofil mit Geburtsdatum, ET für das korrigierte Alter, Geschlecht und Geschwisterwechsel.
- Startbildschirm und Schnellaktionen wählbar; `/` leitet weiter, Dashboard liegt auf `/heute`.
- Backup-Seite: vorhandene Dumps, „jetzt sichern“ über Markierungsdatei, Restore-Anleitung.
- Haushalt samt beider Konten löschbar – mit Passwort, Bestätigungswort und Export daneben.
- Eigene Audiodateien als Einschlafgeräusch: Format wird an der Signatur geprüft, Wiedergabe in
  Schleife über denselben Regler samt Timer, Ausblenden und Sperrbildschirm.
- Meilensteine mit Datum, Notiz und Foto; Sprache und Regionsformat hängen an `src/lib/i18n.ts`.
- Zugriff von außen: Cloudflare Tunnel als optionales Compose-Profil, `APP_URL` für ntfy-Links.
- Grün: lint, typecheck, 354 Unit-Tests (97,7 % Coverage auf der Logik), 60 E2E-Tests, build.

## Phase 8 – Wissen (abgeschlossen)

- Neuer Bereich `/wissen` mit sieben Seiten, erreichbar über „Mehr“.
- Ernährung je Trimester: Nährstoffe mit Lebensmitteln, Energiebedarf, typische Beschwerden.
- „Darf ich das essen?“: über 50 Lebensmittel mit Synonymsuche, drei Einordnungen und Zubereitung.
- Geburtsvorbereitung ab SSW 34: 16 Maßnahmen mit Zeitpunkt und 11 Übungen (Yoga, Atem, Beckenboden).
- Behördenwege Österreich: 19 Meldepflichten mit Frist und Stelle, abhakbar und für beide sichtbar.
- Stillen: Anlegen, Positionen, Probleme mit Warnzeichen, Aufbewahrung abgepumpter Milch.
- Wochenbett: Verlauf, Körper, Babyblues gegen Wochenbettdepression, rote Warnzeichen zuerst.
- 15 Rezepte mit höchstens 15 Minuten aktiver Zeit, filterbar, die Hälfte einhändig essbar.
- Grün: lint, typecheck, 389 Unit-Tests, 70 E2E-Tests, build.

## Phase 9 – Vorsorge, Zähne, Fieber, Vorrat, Töne (abgeschlossen)

- Mutter-Kind-Pass durchgehend in Eltern-Kind-Pass umbenannt, inklusive Datenmigration.
- `/vorsorge`: Impfungen und die zehn Untersuchungen des Kindes mit Zeitfenster, Status und
  Zeitstrahl über fünf Jahre; Erledigt mit Datum, Ort, Notiz und Foto, Impfung schreibt ein Event.
- KBG-Fristen mit der Kürzung von 1.300 € je fehlendem Nachweis; Erinnerung 14 und 3 Tage vorher.
- Quelle und Stand stehen unter jeder Ansicht; ungeprüfte Daten sagen das ausdrücklich.
- `/zaehne`: 20 Milchzähne nach FDI als SVG, Tap für Durchbruch, Ausfall, Notiz und Foto;
  der erste Zahn setzt den Meilenstein von selbst.
- `/gesundheit/fieber` ab 37,5 °C in 72 Stunden: Verlauf mit Medikamenten-Markern, Messort,
  Intervall-Countdown, einseitiger Zettel für die Ordination. Keine Dosisberechnung.
- `/vorrat`: Milchportionen nach Lagerort, FIFO-Vorschlag, Teilentnahme, eigenes Fenster für
  aufgetaute Milch, Push einen Tag vor Ablauf, Etiketten 70 × 37 mm mit QR-Code, 24 auf A4.
- `/tagebuch/toene`: Aufnahme bis drei Minuten, Transkodierung nach Opus, Wellenform,
  gemerkte Abspielstelle, Schlagworte, Meilenstein-Verknüpfung, Offline-Queue.
- Grün: lint, typecheck, 510 Unit-Tests (94,6 % Coverage), 103 E2E-Tests, build.

## Phase 10 – Wochenbett & Zwei-Personen-Betrieb (abgeschlossen)

- `/wachstum` zeigt bis Lebenswoche sechs den Weg zurück aufs Geburtsgewicht statt der Perzentile:
  Differenz in Gramm und Prozent, Verlauf über 28 Tage, Marken bei −7 und −10 %.
- Der Hinweis auf die Hebamme kommt einmal, in Grau: mehr als 10 % Verlust oder Geburtsgewicht
  bis Lebenstag 14 nicht wieder erreicht. Ist es wieder da, tritt die Prozentanzeige zurück.
- `/protokoll`: eine Zeile je Tag mit Lebenstag, Anlegen, ⌀ Dauer, Flasche, ml, Windeln, Schlaf und
  Gewicht; 1/3/7/14 Tage, Durchschnitt in der Fußzeile, Tag antippen zeigt die Einzelereignisse.
- Beide Druckansichten teilen sich Kopfzeile und Layout über `src/lib/print/`; A4 hochkant,
  schwarzweiß, ohne Navigation – nachgeprüft: je genau eine Seite.
- `/notfall`: feste Notrufnummern (144, Vergiftungszentrale, 1450), Kontakte als `tel:`-Links,
  Adresse groß und kopierbar. Ohne Netz vollständig aus IndexedDB.
- Die Karte liest Allergien, Dauermedikamente, Gewicht und Impfungen aus den vorhandenen Quellen;
  neu gepflegt werden nur Blutgruppe, Vorerkrankungen, Adresse und Kontakte.
- Doppelerfassung: tragen beide dasselbe ein, kommt ein nicht-modaler Hinweis mit drei Wegen.
  Offene Fälle zählen nicht in den Wachfenster-Median; ab vier steht der Hinweis auf `/auswertung`.
- Vier PWA-Verknüpfungen mit eigenen Icons (die alten zeigten auf Routen, die es nie gab),
  Share Target für Bilder und Ton, offline über die bestehende Schreib-Queue.
- `/api/v1` für Home Assistant: eigene Tokens, 60 Anfragen pro Minute, Audit-Log, Webhooks,
  `docs/homeassistant.md` mit fertigen Snippets. Der Typ-Enum kommt aus der Ereignis-Registry.
- Grün: lint, typecheck, 600 Unit-Tests (88,2 % Coverage), 154 E2E-Tests, build.

## Phase 11 – Zurückhaltung als Standard (abgeschlossen)

- Neue Haushalte starten im Modus „Nur Protokoll": Schlafrhythmus, Kreisuhr, Auswertung,
  Entwicklung, Perzentilkurven und Eltern-Check-in sind aus. Der Code bleibt vollständig.
- Umschalten unter **Mehr → Was die App anzeigt**: drei Stufen als Voreinstellung, dazu ein
  Schalter je Bereich. Abgeschaltetes verschwindet aus Leiste und Menü, seine Route leitet auf
  `/heute`, seine Abfragen laufen nicht – auch `/api/export/pdf` und `/api/v1/status` prüfen mit.
- Alle Push-Nachrichten aus außer den Eltern-Kind-Pass-Fristen. `lib/push/kategorien.ts` ist eine
  Erlaubnisliste: Aufforderungen, Wochenrückblicke und Tracking-Erinnerungen gehen nie raus.
  Ruhezeit gilt für alles; das Zeitfenster wird einmal beim ersten Einschalten erfragt.
- Abgebaut: Tagesziel mit Balken, Konfidenz in Prozent, roter Übermüdungs-Alarm, „überfällige"
  Meilensteine samt `concernAfterWeeks`, Zähler „x von y" und der Balken im Sprungfenster.
- Vorhersagen sprechen als Beobachtung („Ungefähr ab 13:40 könnte Müdigkeit kommen"). Der Satz
  „Euer Kind kennt seinen Rhythmus besser als die App" steht fest darunter. Regeln in `DESIGN.md`,
  Texte in `lib/sleep/wording.ts`, dort gegen Imperativ, „jetzt", Prozent und Wertung getestet.
- „Mehreres nachtragen" auf `/heute`: Liste statt Assistent, Zeit als Text („vor 2 Stunden",
  „halb drei"), Ein-Tap-Vorschläge ab drei gleichen Werten. Nachgetragenes ist nicht markiert.
- `/willkommen` erklärt beim ersten Start den Protokollmodus – ohne Feature-Rundgang. In den
  Einstellungen: „Auf Protokollmodus zurücksetzen" und „Pause" für 1, 3, 7 oder 30 Tage.

## Phase 12 – Nachbesserungen aus dem echten Betrieb (abgeschlossen)

- Notfallkarte: Die Vergiftungsinformationszentrale beriet laut Text bei „etwas verschluckt" –
  falsch und im Ernstfall gefährlich. Sie ist für den Verdacht auf Vergiftung zuständig und
  verweist jetzt bei Atemnot ausdrücklich auf 144. Quelle mit Stand steht auf der Karte.
- Die schwarz hinterlegten Notrufkarten sind weiß mit terrakottafarbener Kante: gleicher
  Kontrast, ohne wie eine Traueranzeige auszusehen.
- Fotos werden vor dem Upload im Browser auf 2048 px verkleinert (etwa ein Zehntel der
  Datenmenge), einzeln statt gebündelt geschickt, und das Aufnahmedatum wird vorher aus den
  EXIF-Daten gelesen und getrennt mitgeschickt. Damit geht der Upload auch über Mobilfunk durch.
- Die Fehlermeldung nennt den echten Grund statt immer „Keine Verbindung zum Server".
- Druck-Knöpfe statt des Hinweises „über das Browser-Menü drucken" – den es in der installierten
  App auf iOS nicht gibt. Wo ein serverseitiges PDF existiert, steht es daneben.
- Datums- und Zeitfelder: Safari zentrierte den Wert und ignorierte die Feldbreite.
- „Mehr" neu geordnet: Bereiche als Kacheln in zwei Spalten in Gebrauchsreihenfolge, alle
  Einstellungen hinter einer Zeile auf `/mehr/einstellungen`. Von 21 offenen Zeilen auf 7 Reihen.
- Ladezeiten: der Server braucht 40–170 ms; die Zähigkeit kam von der Netzrunde bei jedem
  Wechsel. `staleTimes`, vorgeladene Tab-Ziele und vorgeladene Schriften. Das zuerst gebaute
  `loading.tsx` ist wieder raus: es hat den E2E-Satz von 36 Sekunden auf 5:41 gebracht und
  wäre auch als Bedienung schlechter gewesen (graue Rechtecke bei jedem Wechsel).
- `npm run test:e2e` läuft eigenständig: Datenbank (Docker oder vorhandener Postgres),
  Migration, Build, Server, Tests, Aufräumen. globalTimeout 15 Minuten, Reporter `line`,
  kein Wiederverwenden alter Server.

## Phase 13 – Drucken, Teilen, Fieber eintragen (abgeschlossen)

- „Temperatur eintragen" öffnet den Gesundheits-Dialog, statt auf `/heute` zu verlinken;
  der Knopf steht auch während einer laufenden Episode auf der Fieberseite.
- Vier neue PDF-Ausgaben: Arztzettel (`/api/fieber/pdf`), Jahresrückblick mit Fotos
  (`/api/rueckblick/pdf`), Etikettenbogen in echten 70 × 37 mm (`/api/etiketten/pdf`),
  Zahnschema als Liste (`/api/zaehne/pdf`).
- Alle PDFs gehen `inline` heraus und öffnen in einem neuen Tab: erst dort gibt es auf
  dem iPhone Drucken, „In Dateien sichern" und AirDrop.
- Drucken-Knopf nur, wo `window.print()` etwas bewirkt – in der installierten App auf
  iOS tut es nichts, dort führt allein das PDF weiter.
- PDF-Bausteine brechen jetzt Seiten um; Tabellen wiederholen ihre Kopfzeile.
- Fieberdaten und Rückblick werden von Seite und PDF aus derselben Quelle geladen.
- Grün: lint, typecheck, 764 Unit-Tests, 172 E2E-Tests, build.
