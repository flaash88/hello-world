# Entscheidungen

Kurzbegründungen für alles, was nicht im Prompt vorgegeben war.
Neueste Einträge oben innerhalb der jeweiligen Phase.

## Phase 0 – Grundgerüst

**Next.js 15.5 statt 16.** Der Prompt gibt Next.js 15 verbindlich vor. 15.5 ist
die letzte 15er-Version und wird mit React 19.1 gefahren.

**Prisma 6 statt 7.** Prisma 7 ändert die Client-Erzeugung und den Umgang mit
`prisma.config.ts`. Für ein Projekt, das jahrelang unbeaufsichtigt laufen soll,
ist die eingefahrene 6er-Linie die wartungsärmere Wahl.

**Tailwind 3 statt 4.** Die shadcn/ui-Bausteine sind hier von Hand ins Repo
geschrieben (kein CLI-Aufruf, kein Netzwerk zur Bauzeit) und folgen dem
Tailwind-3-Aufbau mit CSS-Variablen und `tailwind.config.ts`.

**`@node-rs/argon2` statt `argon2`.** Kein `node-gyp`-Build beim Image-Bau,
vorkompilierte Binaries für glibc. Parameter nach OWASP-Empfehlung
(19 MiB, 2 Iterationen, 1 Thread).

**Sessions in der Datenbank, nicht als JWT.** Zwei Nutzer, ein Server – ein
Token in der DB lässt sich sofort widerrufen, ein JWT nicht. Gespeichert wird
nur der SHA-256-Hash des Tokens (mit `SESSION_SECRET` als Pfeffer), damit ein
Datenbank-Dump keine Sitzungsübernahme erlaubt.

**CSRF per Double-Submit-Cookie.** Server Actions bringen bereits einen
Origin-Check mit; für die Route Handler (Offline-Queue, Timer, Uploads) prüfen
wir zusätzlich ein nicht-httpOnly-Cookie gegen einen Header.

**Rate-Limiting in Postgres statt im Speicher.** Überlebt Neustarts und
funktioniert auch, wenn der Next-Server mehrere Worker hat.

**Realtime über `pg_notify` statt eines Brokers.** Kein zusätzlicher Dienst im
LXC. Ein einzelner `LISTEN`-Client pro Prozess verteilt an alle SSE-Ströme; der
25-Sekunden-Ping hält die Verbindung durch den Cloudflare Tunnel offen.

**Nachtmodus über `data-theme="night"` statt `prefers-color-scheme`.** Der
Nachtmodus richtet sich nach der Uhrzeit, nicht nach der Systemeinstellung –
tagsüber im Dunkelmodus zu sitzen ist etwas anderes als nachts um drei.

**Schriften: Nunito + Fraunces, selbst gehostet.** Beide unter SIL OFL, als
Latin-Subset im Repo (zusammen ca. 59 kB). Zur Laufzeit gibt es keinen einzigen
externen Request.

**Ein Haushalt pro Installation.** Das Datenmodell trägt mehrere Haushalte, aber
der Seed legt genau einen an. Registrierung ist ausschließlich per
Einladungscode möglich, der Bootstrap-Code kommt aus der Umgebung.

**Soft-Delete plus Revisionen für Events.** „Alles rückgängig machbar“ heißt in
der Praxis: nichts wird wirklich gelöscht, jede Änderung ist nachvollziehbar.

**Backup als eigener Sidecar-Container.** `pg_dump | gzip` in ein Volume, ohne
cron-Daemon (Shell-Schleife), Aufbewahrung standardmäßig 14 Tage. So bleibt das
App-Image schlank und der Backup-Job läuft auch bei App-Neustarts weiter.

## Phase 1 – Schwangerschaft

**Schwangerschaftsalter aus dem ET, nicht aus der letzten Periode.** Der ET wird
per Ultraschall korrigiert und ist die verlässlichere Größe; die letzte Periode
ist optional. `lastPeriodFromDueDate()` rechnet intern zurück – so funktioniert
alles auch ohne Periodendatum.

**Vorbefüllte Listen werden beim ersten Seitenaufruf in die DB kopiert**
(Kliniktasche, Mutter-Kind-Pass-Termine), nicht bei jedem Rendern aus dem
Template gelesen. Nur so sind sie editierbar und beide sehen denselben Stand.
Die Kopierfunktionen liegen in `lib/pregnancy/seed.ts`, nicht als Server Action:
`revalidatePath` ist während des Renderns nicht erlaubt.

**SSW-Bereiche der Termine werden serverseitig berechnet.** Die Umrechnung
braucht die Zeitzone; im Browser verschiebt eine Zeitumstellung zwischen
Fensterbeginn und Berechnung die Woche sonst um eins.

**4-1-1 wird in drei Teilbedingungen zerlegt** (Abstand, Dauer, Dauerhaftigkeit)
statt als einzelnes Ja/Nein. So sieht man, was noch fehlt, statt nur „nein“.
Die Toleranzen sind bewusst mild (5 statt 4 Minuten, 45 statt 60 Sekunden) –
lieber einmal zu früh anrufen.

**Wehenabstand von Beginn zu Beginn**, wie in der Geburtshilfe üblich – nicht
vom Ende der einen zum Beginn der nächsten.

**Namensvoting blind.** Man sieht die Bewertung der anderen Person erst, wenn
man selbst abgestimmt hat. Ein Treffer entsteht nur bei beidseitigem Ja.

**Vergleichsobst mitteleuropäisch** (Melanzani, Karfiol, Kohlrabi statt
Avocado-Ketten) und alle Wochentexte selbst formuliert. Größen- und
Gewichtsangaben sind gerundete Durchschnittswerte, bis SSW 20 als
Scheitel-Steiß-Länge, danach als Scheitel-Ferse-Länge – der Sprung in der
Tabelle ist deshalb korrekt und wird in der UI erklärt.

## Phase 2 – Tracker

**Ein polymorpher `Event`-Typ statt neun Tabellen.** Alle Tracker teilen sich
Zeitraum, Zuschreibung, Notiz, Soft-Delete und Revisionen; nur die `payload`
unterscheidet sich und wird per zod-Schema je `type` validiert. Eine neue
Tracker-Art kostet damit ein Schema plus ein Formularstück, keine Migration.

**Timer-Zustand liegt am Server, nicht im Browser.** `running`, `pausedAt` und
`pausedSec` stehen in der Datenbank – ein Reload, ein App-Kill oder der Wechsel
aufs andere Handy verlieren nichts, und beide sehen denselben laufenden Timer.

**Schlaf, Stillen und Abpumpen starten mit einem Tap** (`instantStart`), die
Details lassen sich danach nachtragen. Die Flasche braucht dagegen eine Menge –
ohne Eingabeblatt wäre der Eintrag wertlos. Damit ist jede Schnellaktion in
höchstens zwei Taps ab Startbildschirm erledigt.

**Der Stillseiten-Vorschlag kommt aus dem letzten Eintrag** und wird beim
Ein-Tap-Start direkt gesetzt (zuletzt links → jetzt rechts).

**Jeder Schreibvorgang läuft über die IndexedDB-Queue**, auch online. Der
Online-Fall ist dann nur ein sehr kurzer Zwischenstopp, aber es gibt exakt einen
Schreibpfad statt zweier – die Offline-Variante kann so nicht verrotten.
Idempotenz über `clientId` (unique in der DB): ein erneut gesendeter Eintrag
legt nichts doppelt an.

**Konfliktauflösung Last-Write-Wins auf Feldebene.** Die Queue schickt nur
tatsächlich geänderte Felder; wer zuletzt schreibt, gewinnt für genau diese
Felder. Bei zwei Personen und getrennten Geräten ist das die Auflösung, die
niemanden überrascht.

**Nichts wird wirklich gelöscht.** `deletedAt` plus `EventRevision` je Änderung.
Der Toast bietet direkt „Rückgängig“ an.

**Autocomplete für Beikost aus den eigenen Einträgen**, per SQL über
`jsonb_array_elements_text` nach Häufigkeit sortiert – keine mitgelieferte
Lebensmittelliste, die ohnehin nie passt.

**Stuhlfarben und -konsistenzen mit Klartext-Beschreibung** statt bloßer
Farbflecken. Nachts im Dunkeln ist „Senfgelb – typisch bei Muttermilch“
brauchbarer als ein Farbfeld, und die auffälligen Varianten (rötlich, weißlich)
tragen den Hinweis zur Abklärung direkt bei sich.

## Phase 3 – Schlaf-Algorithmus

**Wachfenster statt fixer Uhrzeiten.** Vorhergesagt wird nicht „13:40“, sondern
„nach X Minuten wach“ – das ist die Größe, die sich beim Kind tatsächlich
stabilisiert, und sie funktioniert auch, wenn der Tag völlig verschoben ist.

**Gleitender Median statt Mittelwert, mit IQR-Filter.** Ein einzelnes
Marathon-Wachfenster (Autofahrt, Arztbesuch) darf die Vorhersage nicht
verbiegen. Der Test dazu prüft genau das: ein Ausreißer verschiebt das Ergebnis
um höchstens fünf Minuten.

**Ehrliche Kalibrierung statt Fake-Präzision.** Unter fünf gemessenen
Wachfenstern gibt es keine Uhrzeit, sondern den Hinweis „Kalibriert noch“ samt
Zählerstand. Zwischen 5 und 15 Messungen wächst das Gewicht der eigenen Daten
linear – so kippt die Vorhersage nicht schlagartig bei der fünften Messung.

**Konfidenz aus Datenmenge und Streuung.** Halb aus dem Gewicht der eigenen
Daten, halb aus der Konsistenz (Interquartilsabstand relativ zum Erwartungswert).
Ein Kind mit gleichmäßigem Rhythmus bekommt hohe Konfidenz, ein chaotisches eine
niedrige – und das steht auch so in der UI.

**Das Vorhersagefenster kommt aus der Streuung des Kindes**, nicht aus einem
festen Zuschlag: Quartilsabstand halbiert, mindestens ±10 Minuten.

**Messungen werden gefiltert.** Unter 10 Minuten ist kein Wachfenster (nur kurz
aufgewacht), über dem Dreifachen des Erwartungswerts ist es ein vergessener
Eintrag. Beides würde das Modell sonst systematisch verzerren.

**Korrigiertes Alter bei Frühgeburt** bis zwei Jahre, ab zwei Wochen Differenz.
Ohne das sind alle Erwartungen an ein Frühchen zu hoch angesetzt.

**Nickerchen oder Nacht entscheidet die gemessene Bettzeit** (Median der
Nachtschlaf-Beginne), nicht eine feste Uhrzeit. Der Median wird um Mitternacht
herum korrekt gebildet, damit 23:50 und 00:10 nicht in der Mittagszeit landen.

**Die Kreisuhr hat vier getrennte Ringe** statt eines überlagerten. Schlaf außen,
dann Nahrung, dann Windeln, innen der Rest – so verdeckt ein zehnstündiger
Nachtschlaf nicht sämtliche Fütterungen.

**Erinnerungen laufen über einen Cron-Sidecar**, der alle fünf Minuten einen
geschützten Endpunkt aufruft. Kein zusätzlicher Prozess im App-Container, und
die Logik bleibt in der App statt in einem Shell-Skript.

**ntfy ist ein zusätzlicher Weg, kein Ersatz.** Es läuft unabhängig von Web Push
und schluckt eigene Fehler – wenn der ntfy-Server nicht erreichbar ist, kommt
die Web-Push-Nachricht trotzdem an.
