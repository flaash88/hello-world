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

## Phase 7 – Eltern, Einstellungen, Betrieb

**Der Eltern-Tab misst nichts, er fragt.** Drei Regler und ein Knopf, in zehn
Sekunden erledigt. Kein Score, keine Diagnose, keine Ampel. Aus den Werten
entsteht nur eine einzige Aussage – und die auch nur, wenn sie über Tage
dieselbe bleibt.

**Der Hinweis auf Unterstützung braucht fünf Tage Daten und eine deutliche
Häufung** (siehe `src/lib/parents/support.ts`): mindestens fünf Tage mit
niedriger Stimmung, fünf Nächte unter fünf Stunden oder sechs Tage hoher
Belastung in vierzehn Tagen. Danach ist sieben Tage Ruhe, egal wie die Werte
aussehen. Ein Hinweis, der jeden Tag kommt, wird weggeklickt statt gelesen.
Der Text nennt keine Krankheit und stellt keine Diagnose – ein Test prüft
genau das, damit es beim Umformulieren nicht verrutscht.

**Der Eltern-Tab liegt in der Tab-Leiste, nicht zwei Ebenen tief.** Ein
Check-in, den man erst sucht, macht niemand. Dafür ist das Tagebuch unter
„Mehr“ gewandert: Es wird wöchentlich geöffnet, der Check-in täglich. Bei
paralleler Schwangerschaft weicht die Entwicklungsseite, nicht der Eltern-Tab.

**Die Kontakte sind österreichisch und konkret**: Hebamme, Frühe Hilfen,
Rat auf Draht 147, Telefonseelsorge 142, Rettung 144 – als `tel:`-Links, weil
man nachts keine Nummer abtippt.

**Das private Elterntagebuch ist der einzige nicht geteilte Bereich.** Es ist
an den Nutzer gebunden, nicht an den Haushalt, wird beim JSON-Export nur auf
ausdrücklichen Wunsch mitgegeben und steht mit genau diesem Satz in der App.
Ein E2E-Test meldet sich als zweite Person an und prüft, dass der Eintrag dort
nicht auftaucht.

**Einheiten sind Anzeige, nicht Speicherung.** In der Datenbank steht
ausnahmslos kg, cm, °C und ml; `src/lib/units.ts` rechnet erst an der
Oberfläche um – auch bei der Eingabe, wo `UnitStepper` den eingetippten Wert
zurückrechnet. Dadurch bleiben WHO-Perzentile, Statistik und CSV-Export
unabhängig von der Einstellung, und ein Wechsel der Einheit ändert keine Daten.
Medikamentendosen bleiben in ml und mg, weil das auf der Packung steht. Der BMI
bleibt kg/m², weil es lb/in² nicht gibt.

**Die Wurzel `/` leitet nur weiter, das Dashboard liegt auf `/heute`.**
So bleibt `start_url` im Manifest stabil, während der Startbildschirm frei
wählbar ist. Zeigt die gewählte Seite gerade nichts an (Verlauf ohne Kind,
SSW ohne Schwangerschaft), landet man auf dem Dashboard statt auf einer leeren
Seite.

**Die App fordert Backups an, sie erstellt sie nicht.** Das App-Image hat kein
`pg_dump` und keine Schreibrechte im Backup-Volume; „Jetzt sichern“ legt eine
Markierungsdatei im Upload-Volume ab, das der Sidecar nur lesend eingebunden
hat. Ist die Markierung neuer als der letzte Lauf, sichert er. Kein Container
schreibt ins Volume des anderen, und trotzdem funktioniert der Knopf. Fehlt
das Backup-Volume (lokale Entwicklung), sagt die Seite das offen, statt eine
Sicherung zu behaupten.

**„Konto löschen“ löscht den Haushalt, nicht eine Person.** Bei zwei Personen
in einem gemeinsamen Verlauf hängt an jedem Eintrag, wer ihn gemacht hat. Ein
halber Haushalt wäre entweder ein kaputter Verlauf (fehlende Urheber) oder ein
gefälschter (umgeschriebene Urheber). Deshalb löscht der Knopf alles – nach
Passwort und getipptem Bestätigungswort, mit dem Export-Link direkt daneben.
Die Bilddateien gehen erst nach dem Datenbank-Commit; bricht der ab, sind sie
noch da.

**Der Wechsel „Kind anlegen“ liegt im Kindprofil, nicht in einem eigenen
Menü.** Das Datenmodell kann Geschwister; die Oberfläche zeigt eines und
schaltet erst um, wenn es wirklich mehr als eines gibt.

**Eigene Audiodateien werden nicht neu kodiert.** Bei Bildern kann `sharp` das
Format erzwingen und dabei EXIF entfernen; für Audio bräuchte es einen Decoder
im Image, und dafür ist das Feature zu klein. Stattdessen entscheidet die
Signatur am Dateianfang über das Format (Endung und gemeldeter MIME-Type sind
frei wählbar), ausgeliefert wird nur mit dem so erkannten Typ, und die Datei
liegt wie die Fotos hinter der Anmeldung statt in `public`. Enthaltene Tags
bleiben erhalten – das steht so in der Oberfläche.

**Eigene Klänge gehören dem Haushalt, nicht dem Kind.** Ein
Einschlafgeräusch überdauert das erste Jahr und gilt auch fürs Geschwisterkind.
Im JSON-Backup steht deshalb nur, welche Klänge es gab; die Audiodateien selbst
liegen im Upload-Volume, sonst wäre ein Backup je nach Sammlung hundert
Megabyte groß.

**Meilensteine bekommen Datum, Notiz und Foto erst im zweiten Schritt.** Das
Abhaken bleibt ein Tap – wer im Moment nur bestätigen will, wird nicht mit
einem Formular aufgehalten. Der Stift daneben öffnet die Details. Das Foto
läuft durch denselben Upload wie das Tagebuch, wird also ebenfalls neu kodiert
und von EXIF befreit, und muss zum selben Kind gehören.

**i18n: ein Seam, keine Nachrichtendateien.** Sprache und Regionsformat hängen
an `src/lib/i18n.ts`; alle Datums-, Zahlen- und Einheitenformate gehen über
`localeTag()`, die Wocheninhalte liegen unter `content/weeks/<locale>/`, und
`<html lang>` kommt aus derselben Konstante. Die UI-Texte selbst stehen im
Quelltext. Für genau eine Sprache kostet `t('sleep.startedAt')` Lesbarkeit und
bringt nichts; kommt eine zweite dazu, sind wenigstens die Formate schon
richtig aufgehängt und der Ort dafür steht fest.

**Die Prisma-CLI wird im Runtime-Image installiert, nicht hineinkopiert.** Der
erste Deploy auf echter Hardware ist daran gescheitert: `node_modules/.bin/prisma`
ist ein Symlink, den `COPY` zu einer echten Datei macht – die CLI sucht ihre
WASM-Dateien danach neben sich in `.bin` statt in `prisma/build`. Dahinter lagen
noch zwei fehlende Pakete (`@prisma/engines`, `effect` über `@prisma/config`).
Ein Teil-Kopieren dieser Kette ist bei jedem Prisma-Update wieder falsch,
deshalb steht die CLI jetzt eigenständig unter `/opt/prisma-cli`, mit der
Version aus der `package.json` und einem `--version`-Rauchtest im Build. Wenn
etwas fehlt, scheitert der Build – nicht der Containerstart in einer
Restart-Schleife.

## Phase 8 – Wissen

**Kein Foto-Scanner für Lebensmittel.** Die naheliegende Umsetzung von „darf
ich das essen?“ wäre: Bild aufnehmen, an ein Bilderkennungsmodell schicken,
Antwort anzeigen. Das hiesse, Fotos aus der Küche an einen fremden Dienst zu
geben – bei einer App, deren ganzer Sinn ist, dass nichts das Haus verlässt.
Stattdessen eine durchsuchbare Liste mit Synonymen: über 50 Einträge, Treffer
in Millisekunden, funktioniert offline, und sie sagt zusätzlich, was die Sache
sicher macht („Camembert überbacken ist in Ordnung“) statt nur ja oder nein.

**Bei Unbekanntem lieber nichts sagen.** Findet die Suche einen Begriff nicht,
kommt keine geratene Einschätzung, sondern die Grundregel und der Hinweis, bei
der Hebamme zu fragen. Ein falsches „Ja“ wäre hier teurer als ein „Weiß ich
nicht“.

**Drei Einordnungen statt zwei.** „Kommt darauf an“ ist die häufigste ehrliche
Antwort – bei Feta, Kaffee, Räucherlachs. Ein Test erzwingt, dass jeder
solche Eintrag auch erklärt, worauf es ankommt.

**Fristen mit sichtbarem Stand und zuständiger Stelle.** Behördenfristen
veralten, und eine falsche Frist kostet in Österreich echtes Geld – wer das
Kinderbetreuungsgeld später als 182 Tage rückwirkend beantragt, verliert
Bezugstage endgültig. Deshalb trägt jeder Eintrag die zuständige Stelle, die
Seite trägt ein Datum, und die Quellen stehen sichtbar darunter statt im
Impressum.

**Der Eltern-Kind-Pass heißt so.** Der Mutter-Kind-Pass wurde mit der
Digitalisierung umbenannt. Die App nennt den neuen Namen und den alten dazu,
weil im Alltag noch beide kursieren – ein Test hält beides fest.

**Die Behörden-Checkliste speichert nur den Zustand.** Frist, Stelle und
Hinweis kommen weiter aus dem Content-Modul, verknüpft über einen
`templateKey` an `ChecklistItem` – dieselbe Mechanik wie bei den
Mutter-Kind-Pass-Terminen. Dadurch lassen sich Texte korrigieren, ohne dass
ein Haken verloren geht, und neue Einträge werden nachgezogen.

**Nährstoffe statt Kalorien.** Die Ernährungsseite nennt bewusst zuerst, was
knapp wird (Folsäure, Jod, Eisen, DHA), und erst danach den Energiebedarf – mit
der konkreten Ansage, dass der Mehrbedarf einer Jause entspricht und nicht
einer zweiten Portion. „Für zwei essen“ ist der verbreitetste Irrtum in dieser
Zeit.

**Übungen mit Gegenanzeigen.** Die tiefe Hocke steht erst ab SSW 34 und mit dem
ausdrücklichen Hinweis, sie bei tiefliegender Plazenta, vorzeitigen Wehen oder
Beckenendlage vorher abzuklären. Ein Test prüft genau diesen Hinweis, damit er
beim Umformulieren nicht verschwindet.

**Warnzeichen zuerst, nicht am Ende.** Auf der Wochenbett-Seite steht die rote
Karte mit Fieber, starker Blutung und Präeklampsie-Zeichen ganz oben – vor
allem Erklärenden. Wer sie braucht, scrollt nicht.

## Phase 9

### Herkunft der Vorsorgedaten – bitte vor dem Verlassen auf sie lesen

Die beiden Dateien unter `content/vorsorge/` tragen beide `"geprueft": false`.
Das ist keine Formalie, sondern der Kern dieser Entscheidung.

**Impfplan Österreich 2025/2026** (`impfplan-2025-2026.json`)
- Angegebene Quelle: Impfplan Österreich 2025/2026, Version 1.1, Stand 10.10.2025,
  Bundesministerium für Arbeit, Soziales, Gesundheit, Pflege und Konsumentenschutz,
  `sozialministerium.gv.at/impfplan`.
- Tatsächlich übernommen aus: Zusammenfassungen der offiziellen Seiten. Der direkte
  Abruf des PDFs war aus der Entwicklungsumgebung gesperrt (`EGRESS_BLOCKED`).
- Abgerufen am: 23.08.2026.
- **Vor der Verwendung gegen das Original-PDF zu prüfen.** Das gilt für jeden
  einzelnen Termin und ausdrücklich auch für die Umrechnung der Zeitangaben: die
  Quellen formulieren teils ordinal („im 3. Lebensmonat“), teils vollendet („ab der
  vollendeten 7. Lebenswoche“). In der Datei stehen durchgehend vollendete
  Einheiten; das kann um bis zu eine Woche bzw. einen Monat abweichen.
- Nächste Prüfung: **jährlich**, sobald der neue Impfplan erscheint (üblicherweise
  im Herbst). Danach `version`, `stand` und `abgerufenAm` mitziehen.

**Eltern-Kind-Pass-Untersuchungen** (`ekp-untersuchungen.json`)
- Angegebene Quelle: Eltern-Kind-Pass-Verordnung, dargestellt auf `gesundheit.gv.at`
  und `oesterreich.gv.at`.
- Tatsächlich übernommen aus: Zusammenfassungen derselben Seiten; der direkte Abruf
  war ebenfalls gesperrt.
- Abgerufen am: 23.08.2026.
- Belegt sind die Untersuchungen 1, 2, 3, 5, 7, 8 und 10 samt Zeitfenster und die
  beiden KBG-Fristen. **Die Untersuchungen 4, 6 und 9 tragen bewusst
  `"fenster": null`** und in der UI den Satz, im Pass nachzusehen.
- Nächste Prüfung: mit dem **digitalen Eltern-Kind-Pass ab Oktober 2026** – dann
  liegen die Zeiträume in einer belastbaren Form vor und die drei offenen Einträge
  gehören ergänzt.

**Es wurde kein einziger Termin geraten.** Wo nichts zu belegen war, steht `null`
und ein Hinweis, nachzusehen. Das ist der ganze Punkt: eine erfundene Frist wäre in
diesem Bereich schlimmer als eine fehlende, weil sie geglaubt wird.

### Weitere Entscheidungen dieser Phase

**Vollendete Einheiten als einzige Zeitrechnung.** Impfplan und Pass mischen ordinale
und vollendete Angaben. Statt beides zu unterstützen, steht in den Daten durchgehend
die vollendete Einheit, und der Wortlaut der Quelle bleibt daneben in `fensterText`
bzw. `hinweis` stehen. Eine Rechnung, zwei Lesarten – und die Quelle bleibt
nachlesbar.

**Abgelaufene Fenster ohne Drama.** Ein verpasster Termin ist ein Termin, der
nachgeholt wird. Deshalb heißt es „Fenster seit … vorbei – Termin lässt sich
nachholen“, in Grau statt in Rot, und ein Test verbietet die Wörter „verpasst“ und
„versäumt“.

**Zahndurchbruch als Spanne, nie als Norm.** Zwischen dem ersten Zahn mit vier und
dem ersten Zahn mit dreizehn Monaten liegt nichts als Zufall. Die Zeitangaben stehen
als Spanne da, „erwartete“ Zähne sind nur angedeutet, und ein Test hält fest, dass
nirgends „sollte“ oder „zu spät“ steht.

**Der erste Zahn setzt den Meilenstein selbst.** Wer den Zahn einträgt, hat den
Meilenstein damit erlebt – ihn ein zweites Mal abzuhaken wäre Bürokratie. Kommt
später ein früheres Datum dazu, wandert der Meilenstein mit.

**Fieber: Intervalle ja, Dosierung nein.** Die App erinnert ausschließlich an das
Intervall, das selbst eingetragen wurde. Sie rechnet keine Menge nach Gewicht oder
Alter aus, schlägt kein Präparat vor und prüft keine Höchstmenge – es gibt bewusst
keinen „zu viel“-Alarm. Eine falsch gerechnete Dosis wäre der einzige Weg, mit
dieser App echten Schaden anzurichten. Der Hinweis dazu steht einmalig beim ersten
Öffnen und dauerhaft unter der Ansicht.

**Referenzlinien in Grau.** 37,5 und 38,5 °C markieren, sie warnen nicht. Rot wäre
eine medizinische Aussage, die diese App nicht treffen darf; Messorte werden über
die Form der Punkte unterschieden, damit auch der Ausdruck in Schwarzweiß lesbar
bleibt.

**Der Arztzettel gehört der Ärztin.** Eine Seite, A4, schwarz auf weiß, kein Logo,
kein App-Name als Werbung – nur die Daten, die in der Ordination gefragt werden,
und Platz für handschriftliche Notizen.

**Haltbarkeiten als Konstante mit Quelle und Schalter.** Die Vorgaben (4 Tage
Kühlschrank, 6 Monate Gefrierfach, 12 Monate Tiefkühler, 24 Stunden aufgetaut)
stehen mit Quelle im Kommentar in `src/lib/milk/storage.ts` und lassen sich im
Haushalt überschreiben. Wenn die Hebamme etwas anderes sagt, gilt die Hebamme.

**Aufgetaute Milch kennt keinen Weg zurück.** Wieder einfrieren ist keine Option,
also gibt es dafür auch keinen Knopf. Die Portion wandert in den Kühlschrank und
bekommt das kurze Fenster ab dem Auftauen.

**QR-Codes werden serverseitig gerendert.** Der Code entsteht als SVG im Server und
steht direkt in der Seite – kein Skript im Browser, kein externer Dienst, passend zu
„keine externen Requests zur Laufzeit“. Ohne gesetzte `APP_URL` bleibt er weg, statt
ins Leere zu zeigen.

**Aufnahmen als Opus, Original weg.** 64 kbit/s mono reichen für ein Lachen; drei
Minuten wiegen damit gut 1,4 MB und passen in Backup und Export. Das Original wird
erst gelöscht, wenn die Umwandlung wirklich durch ist – eine halbe Datei wäre
schlimmer als keine.

**Das Mikrofon wird erst gefragt, wenn es gebraucht wird.** Eine
Berechtigungsabfrage beim bloßen Öffnen der Seite hat sich noch nie jemand
gewünscht.

**Die Wellenform entsteht einmal.** Beim Hochladen liest ffmpeg die Datei als rohes
PCM und fasst sie zu 96 Ausschlägen zusammen. Der Player zeichnet danach nur noch –
kein Decodieren im Browser, kein Ruckeln auf dem Telefon.

**Aufnahmen liegen als ArrayBuffer in der Queue.** Blobs in IndexedDB sind je nach
Browser heikel, Rohdaten sind es nirgends. Der Blob entsteht erst beim Hochladen
wieder.
