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

## Phase 4 – Statistiken, Wachstum, Export

**Die echten WHO-LMS-Tabellen liegen als JSON im Repo** (330 kB, Tagesauflösung
0–5 Jahre, vier Indikatoren × zwei Geschlechter), samt `NOTICE.md` mit Quelle
und Lizenzlage. Die Rechnung (`lms.ts`) ist selbst implementiert – eine
Näherung der Kurven wäre bei Babygewichten die falsche Sparsamkeit.

**Der Sprung der Längenkurve mit 24 Monaten wird nicht geglättet.** Die WHO
misst ab da im Stehen statt im Liegen, die Referenz fällt um rund 0,7 cm. Ein
Test sichert genau diesen Sprung ab, und die UI erklärt ihn an der Stelle.

**Perzentile werden wertfrei formuliert.** „Auf dem 50. Perzentil“, nie „zu
leicht“ oder „zu schwer“. Der begleitende Hinweis sagt, dass der Verlauf zählt
und nicht der einzelne Punkt.

**CSV mit Semikolon und Dezimalkomma, mit BOM.** So öffnet Excel in deutscher
Spracheinstellung die Datei direkt richtig, statt alles in eine Spalte zu
kippen.

**Das JSON-Backup enthält keine Passwort-Hashes, Sessions oder
Einladungscodes.** Ein Export landet erfahrungsgemäß irgendwann in einer Cloud;
Zugangsdaten haben darin nichts verloren. Ein E2E-Test prüft das.

**Das private Elterntagebuch ist nur im eigenen Export enthalten**
(`?privat=1`) – der einzige Bereich, den die andere Person nicht sieht, bleibt
auch im Backup privat, solange man es nicht ausdrücklich will.

**PDF mit pdf-lib und Standardschrift Helvetica.** Keine eingebettete Schrift,
kein Rendern im Browser: Der Bericht entsteht serverseitig in ein paar
Millisekunden. Zeichen außerhalb von WinAnsi werden vorher ersetzt.

**Der Wochenrückblick beschreibt, statt zu bewerten.** Kein „zu wenig Schlaf“,
sondern „im Schnitt X pro Tag, −Y gegenüber der Vorwoche“. Trends erst ab fünf
Prozent Unterschied – darunter ist es Rauschen. Ein Test prüft, dass keine
wertenden Formulierungen auftauchen.

**API-Routen liegen außerhalb der Middleware.** Sie prüfen die Session selbst
und antworten mit 401, statt einen API-Client auf die Anmeldeseite umzuleiten.

**`COOKIE_SECURE` ist konfigurierbar.** Standard ist an (die App läuft hinter
HTTPS), abschaltbar für Installationen ohne TLS im LAN – und für die
E2E-Tests, die über http laufen.

**Coverage-Grenze gilt für die Logik, nicht für die Datenbankschicht.**
Prisma-gebundene Module (`queries`, `service`, `analysis`, `push`, Actions) sind
von der Messung ausgenommen und stattdessen durch die Playwright-Tests
abgedeckt. Ein Prisma-Mock würde dort nur den Mock testen. Auf dem
verbleibenden Teil liegt die Abdeckung bei rund 95 Prozent.

## Phase 5 – Content, Sprünge, Übungen, Meilensteine

**77 Content-Einträge statt 157 Dateien.** Der Prompt erlaubt ab Woche 53
monatsweise Bündelung; genutzt wird sie konsequent. Wochen 0 bis 52 haben je
einen eigenen Eintrag, danach deckt einer den Lebensmonat ab. Der Loader sucht
zu jeder Woche den passenden Eintrag, und die UI schreibt dazu, für welchen
Zeitraum er gilt – statt so zu tun, als wäre Woche 137 anders als Woche 138.

**Content als Markdown mit Frontmatter, nicht als TypeScript.** Texte ändert
man leichter, wenn sie nicht in Anführungszeichen stehen. Der Loader zerlegt
an den `##`-Überschriften und ist damit unabhängig von der Abschnittsanzahl.

**Sprünge werden mit ihrer eigenen Unsicherheit ausgeliefert.** Die feste
Einteilung der Entwicklungssprünge ist wissenschaftlich umstritten – das steht
direkt auf der Karte, nicht im Kleingedruckten. Als Erklärung für eine
anstrengende Woche bleibt sie nützlich, als Prognose nicht.

**Sprünge und Content rechnen mit dem korrigierten Alter.** Bei einem Frühchen
wäre sonst alles um Wochen zu früh angesetzt.

**236 Übungen, alle mit Alltagsmaterial.** Was gekauft werden muss, wird selten
benutzt. Jede Übung hat Ziel, Material, drei bis fünf Schritte und eine Dauer;
Tests prüfen genau das für jeden Eintrag, inklusive lückenloser Abdeckung jeder
Woche von 0 bis 156.

**Die Übung des Tages ist deterministisch** aus Alter und Datum berechnet –
beide Elternteile sehen dieselbe, und sie wechselt täglich. Bereits gemachte
Übungen werden bevorzugt übersprungen.

**69 Meilensteine mit breiten Zeitfenstern.** Wo das Ausbleiben ein echtes
Warnsignal wäre, trägt der Eintrag eine eigene Grenze (`concernAfterWeeks`) und
landet dann in „Beim nächsten Termin ansprechen“ – formuliert als Erinnerung,
nicht als Diagnose.

**Die Tab-Leiste ist dynamisch und bleibt bei höchstens fünf Zielen.** Solange
nur eine Schwangerschaft läuft, ist die SSW-Ansicht wichtiger als eine
Auswertung ohne Daten. Übergeben werden nur serialisierbare Schlüssel; die
Symbole ordnet die Client-Komponente zu.

## Phase 6 – Tagebuch, Fotos, Sounds

**Bilder werden immer neu kodiert, nie kopiert.** Das entfernt sämtliche
EXIF-Daten inklusive GPS-Koordinaten und stellt sicher, dass keine als Bild
getarnte Datei ausgeliefert wird. Das Aufnahmedatum wird vorher ausgelesen und
als Vorschlag für den Eintrag angeboten. Ein E2E-Test prüft, dass das
EXIF-Datum im ausgelieferten Bild nicht mehr auftaucht.

**Der Dateityp kommt aus dem Inhalt, nicht aus dem MIME-Type.** Beides ist
frei wählbar; `sharp` entscheidet anhand der tatsächlichen Bytes. Eine
Textdatei mit der Endung `.jpg` wird abgelehnt – auch das ist getestet.

**Uploads liegen außerhalb von `public` und werden über eine Route
ausgeliefert**, die Session und Haushaltszugehörigkeit prüft. Ein Bild ist ohne
Anmeldung nicht abrufbar, selbst wenn man den Pfad kennt (E2E-geprüft, 401).
Der Pfad wird gegen Ausbruch aus dem Upload-Verzeichnis abgesichert.

**WebP statt Original.** Ein 4-MB-Handyfoto wird zu etwa 300 kB, bei zwei
Größen (2048 px und 480 px Thumbnail). Über Jahre summiert sich das zu einem
Unterschied, den ein Proxmox-Volume merkt.

**Sounds werden synthetisiert, nicht ausgeliefert.** Weißes, rosa und braunes
Rauschen entstehen im Browser, alles andere ist gefiltertes Rauschen plus
langsame Modulation. Kein Download, keine Lizenzfragen, keine hörbare Schleife
und unbegrenzte Laufzeit – bei wenigen Kilobyte Code.

**Rosa Rauschen nach dem Verfahren von Paul Kellet**, weil eine Kaskade von
Tiefpassfiltern den 1/f-Verlauf deutlich genauer trifft als das naive
Verfahren, und das hört man.

**Der Timer blendet aus, statt zu stoppen.** Ein abrupter Abbruch weckt
zuverlässiger als jedes Geräusch. Ausgeblendet wird über zehn Prozent der
eingestellten Laufzeit, mindestens zehn und höchstens sechzig Sekunden.

**MediaSession-Anbindung**, damit die Wiedergabe auf dem Sperrbildschirm
sichtbar und steuerbar bleibt – und iOS den Ton bei gesperrtem Display eher am
Leben lässt.

**Der Jahresrückblick ist eine druckbare Seite, kein PDF-Export.** Der Browser
macht daraus mit zwei Taps ein PDF, und die Seite bleibt dabei durchsuchbar
und kopierbar. Eigene Druckregeln blenden Navigation und Statusleisten aus.
