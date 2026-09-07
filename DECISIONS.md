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

## Phase 10

**Geburtsgewicht in Gramm, ganzzahlig.** `GrowthMeasurement` rechnet in Kilogramm
mit Nachkommastellen, `Child.birthWeightG` in ganzen Gramm. In den ersten Wochen
ist der Unterschied zwischen 3.400 und 3.450 Gramm genau der Punkt, und die
Klinikwaage zeigt Gramm an. Dazu kam `formatGrams()` in der Einheitenschicht –
`formatMass()` wechselt ab einem Kilo auf Kilogramm und verlöre die Auflösung.

**Die Neugeborenen-Ansicht rechnet, sie bewertet nicht.** Ein Verlust bis etwa
7 % ist normal, bis 10 % kommt vor – deshalb stehen beide Marken grau und
gestrichelt im Diagramm, ohne Farbe und ohne Wort. Der einzige Satz, den die App
sagt, ist die Anregung, es bei der Hebamme anzusprechen; er kommt einmal und
verschwindet, sobald das Geburtsgewicht wieder erreicht ist. Ein Test verbietet
„verpasst“ und „versäumt“ in diesen Texten.

**Ein Druckmodul für beide Zettel.** Der Zettel für die Ordination (9.3) und das
Stillprotokoll fragen nach denselben Kopfangaben. Statt das Layout zweimal zu
bauen, liegt es in `src/lib/print/`: `kopf.ts` baut die Felder, `document.ts` die
pdf-lib-Bausteine, `print-header.tsx` die Fassung für den Browser. Der
Wochenbericht zeichnet über dieselben Funktionen.

**`header` und `nav` werden im Druck nicht mehr pauschal ausgeblendet.** Die alte
Regel `header, nav { display: none }` hat auch die Kopfzeile der Druckansichten
erwischt – aufgefallen ist das erst, als der Test den Ausdruck wirklich als PDF
gelesen hat. Jetzt trägt die App-Hülle `print:hidden`, und beide Ausdrucke sind
gegen A4 geprüft: je genau eine Seite, mit Kopf, ohne Bedienelemente.

**Die Notfallkarte legt keine zweiten Felder an.** Doppelt gepflegte Notfalldaten
sind schlimmer als keine: irgendwann stimmt eine der beiden Fassungen nicht mehr,
und man merkt es im falschen Moment. Damit die Gesundheitskategorie diese Quelle
wirklich sein kann, hat sie jetzt eine Art „Allergie“ und beim Medikament einen
Schalter „Dauermedikament“ – ohne die beiden hätte die Karte doch eigene Felder
gebraucht. Neu sind nur Blutgruppe, Vorerkrankungen, Adresse und Kontakte.

**Kein Nachtmodus auf der Notfallkarte.** Wer sie öffnet, braucht sie jetzt und
nicht schonend: maximaler Kontrast, sehr große Schrift, jede Nummer über die
volle Breite antippbar. Rettung und Vergiftungszentrale stehen invertiert, die
Beratungsnummer normal – die Reihenfolge auf dem Schirm ist die Reihenfolge der
Dringlichkeit.

**Offline heißt hier wirklich offline.** Die Karte wird bei jedem Besuch in
IndexedDB gespiegelt, das Dokument hält der Service Worker vor. Ohne beides
zusammen wäre die Seite ohne Netz entweder leer oder veraltet.

**Doppelerfassung blockiert nicht.** Der Eintrag wird gespeichert, danach fragt
die App. Nachts um drei ist ein Dialog, der das Speichern verhindert, das Letzte,
was jemand braucht. Wer den Hinweis ignoriert, verliert nichts – der Verdacht
bleibt offen und taucht in der Auswertung wieder auf.

**Ausgeschlossen wird der neuere Eintrag.** Zwei Einträge für denselben Schlaf
ergäben ein Wachfenster von null Minuten und würden den Median verziehen. Der
ältere bleibt in der Statistik, damit das Ereignis nicht ganz verschwindet.

**Den Eintrag der anderen Person kann niemand löschen.** „Meinen löschen“ gibt es
nur für den eigenen. Etwas wegzuräumen, das jemand anderes eingetragen hat, ohne
dass er es merkt, wäre übergriffig – „Beide behalten“ ist dafür da.

**30 Minuten Fenster bei Medikamenten.** Bleibt eine doppelte Gabe stehen, glauben
beide, die Dosis sei zweimal gegeben worden. Deshalb das größte Fenster und der
deutlichste Hinweis – im selben Rahmen wie Phase 9.3: die App rechnet weiterhin
nichts aus, sie zählt nur.

**Die alten PWA-Verknüpfungen zeigten ins Leere.** `/schnell/schlaf`,
`/schnell/stillen` und `/schnell/windel` standen seit Phase 0 im Manifest, die
Routen gab es nie. Jetzt führen sie auf `/heute?action=…`; der Parameter
verschwindet sofort per `history.replaceState`, sonst startet ein Neuladen den
Timer ein zweites Mal.

**Relativer Location-Header beim Share Target.** `Response.redirect()` verlangt
eine absolute URL, und die wäre hinter dem Tunnel die interne Containeradresse
gewesen – der Browser wäre im Nichts gelandet. Aufgefallen im Test, weil der
Cookie auf einem anderen Host nicht mitkam.

**Die API akzeptiert keine Cookies.** Ein Token, der am NFC-Tag oder in der
Home-Assistant-Konfiguration steht, soll nicht dieselben Rechte haben wie eine
angemeldete Person am Handy. Weil `/api/v1` Cookies gar nicht erst liest, ist CSRF
über diese Endpunkte ausgeschlossen; CORS ist aus, das Limit liegt bei 60
Anfragen pro Minute je Token, und jeder Zugriff steht im Audit-Log.

**Der Typ-Enum der API wird abgeleitet, nicht getippt.** `API_TYPES` entsteht aus
`EVENT_TYPES` und `HEALTH_KINDS`. Ein Test hält fest, dass jeder Ereignistyp darin
auftaucht und nichts darin steht, was nicht aus einer Registry kommt – kommt
später ein Typ dazu, kann die API ihn sofort.

**Tokens sind nicht im Backup.** Sie liegen nur gehasht in der DB und wären in
einer Sicherung wertlos. Webhooks schon – die sind Konfiguration, kein Geheimnis.

**iOS liest weder Verknüpfungen noch Share Target.** Beides ist Android-Sache.
Was auf dem iPhone zählt, ist das Manifest mit `display: standalone`, das
Apple-Touch-Icon und der Titel; die alte Schreibweise
`apple-mobile-web-app-capable` steht zusätzlich im Kopf, weil sie ältere Geräte
noch brauchen und nichts kostet. Beides ist im E2E-Lauf gegen die ausgelieferte
Seite geprüft, nicht nur behauptet.

## Phase 11 – Zurückhaltung als Standard

**Der Auslieferungszustand ist ein Protokoll.** `Household.featureLevel` steht
für neue Haushalte auf `protokoll`, und die Stufe schaltet nichts ein.
Mitschreiben, nachlesen, ausdrucken – Schlafrhythmus, Auswertung, Entwicklung,
Perzentilkurven, Kreisuhr und Eltern-Check-in sind aus. Der Code ist
vollständig da, er läuft nur nicht. Wer mehr will, findet es unter
**Mehr → Was die App anzeigt** und schaltet es einzeln dazu.

**Stufe plus Abweichung statt sechs loser Schalter.** Die Stufe (`protokoll`,
`erweitert`, `voll`) ist eine Voreinstellung, `featureOverrides` hält fest, wo
jemand davon abweicht. Deckt sich der Wunsch wieder mit der Stufe, verschwindet
der Eintrag. So bleibt „zurück auf Protokoll" ein einziger Schalter und keine
Rechnung, und die Einzelschalter behalten trotzdem Vorrang.

**Nicht ausgrauen, nicht laden.** Ein abgeschalteter Bereich verschwindet aus
der Tab-Leiste und aus dem Menü, seine Route leitet auf `/heute` um, seine
Abfragen laufen nicht. Auch `/api/export/pdf` und das Vorhersagefeld in
`/api/v1/status` prüfen den Schalter – sonst wäre er eine Attrappe, die man mit
einer URL umgeht. Eine graue Kachel mit „nicht aktiv" wäre genau die Einladung,
die diese Phase vermeiden soll.

**Bestehende Haushalte ziehen mit.** Die Migration setzt die neuen Spalten mit
ihrem Default, und `medicationAlerts` und `milkExpiryPush` werden auch dort
zurückgenommen, wo sie schon eingeschaltet waren. Das ist gewollt: die App
ändert ihr Verhalten, also fängt sie neu bei still an. Nichts davon löscht
Daten.

**Der Eltern-Tab bleibt, der Check-in geht.** Abgeschaltet wird die tägliche
Frage nach Stimmung, Energie und Schlaf samt dem daraus abgeleiteten Signal –
eine tägliche Selbstbenotung ist genau das Muster, das hier weg soll. Die
Nachtschicht-Übergabe und das private Tagebuch bleiben: die bewerten niemanden
und sind zu zweit nützlich.

**Push ist eine Erlaubnisliste.** `src/lib/push/kategorien.ts` zählt auf, was
überhaupt verschickt werden darf; `darfSenden` gibt für alles andere `false`
zurück, auch wenn eine Einstellung danach aussieht. Erlaubt sind Terminfristen
(standardmäßig an, weil daran Geld hängt) sowie Schlaffenster,
Medikamenten-Intervall, Milchvorrat und Nachtschicht-Übergabe – alle vier
standardmäßig aus und alle vier an etwas geknüpft, das die Eltern selbst
eingetragen haben. Die alten Kategorien „Fütterung" und „Einträge der anderen
Person" sind aus der Liste gefallen; sie hatten ohnehin keinen Absender, und
eine Erinnerung, etwas zu tracken, soll es nicht geben. Eine unbekannte
Erinnerungsart wird stumm abgehakt statt versendet.

**Ruhezeit gilt für alles, auch für Termine.** Die Frage nach dem Zeitfenster
kommt einmal, beim ersten Einschalten irgendeiner Benachrichtigung, und gilt
danach als beantwortet – auch dann, wenn die Antwort „keine Ruhezeit" war.

**Kein „überfällig" bei Meilensteinen.** Das Feld `concernAfterWeeks` und die
Funktion `overdueMilestones` sind ersatzlos entfallen. Ob die Entwicklung
altersgemäß läuft, beurteilt die Ärztin bei den Eltern-Kind-Pass-Untersuchungen;
deren Fristen führt die App weiter, und das ist der richtige Ort dafür. Eine App,
die zwischendurch „fehlt noch" sagt, macht Sorgen, die sie nicht auflösen kann.

**Rot bleibt genau an einer Stelle.** Der Hinweis auf rötlichen oder weißlichen
Stuhl in der Auswertung ist ein medizinisches Warnzeichen, keine Abweichung von
einer Vorgabe. Alles andere – übermüdet, Zeitfenster vorbei, Tagesziel nicht
erreicht – hat seine Signalfarbe verloren oder ist ganz verschwunden.

**Zwei Fortschrittsbalken bleiben.** Der Ring zum errechneten Termin und die
Kliniktasche zählen keine Leistung des Kindes: der eine läuft auf ein Datum zu,
die andere ist eine Packliste. Der Balken im Sprungfenster und das Tagesziel im
Schlaf sind weg.

**Der Schlafdruck-Ring zeigt Zeit statt Prozent.** Eine Ampel, die auf Rot
springt, sagt „ihr habt etwas verpasst". In der Mitte steht jetzt die Zeit
seit dem Aufwachen, der Ring ist einfarbig, und über 100 % läuft ein zweiter
dünner Ring in derselben Farbe weiter.

**Vorhersagen sind Beobachtungen.** `src/lib/sleep/wording.ts` hält die Texte
an einer Stelle, damit sie prüfbar sind: keine Anweisung, kein „jetzt", kein
Countdown, keine Prozentzahl auf eine Vermutung. Tests im Modul lesen alle
erzeugten Sätze gegen diese Regeln. Der feste Satz *„Das ist aus euren
bisherigen Einträgen gerechnet. Euer Kind kennt seinen Rhythmus besser als die
App."* steht unter jeder Ansicht mit Vorhersage und lässt sich nicht
wegklicken.

**Nachtragen ohne Zeitwähler.** Nachts merkt man sich „vor zwei Stunden" oder
„halb drei", nicht 02:30 auf einem Rädchen. `zeitEingabe` versteht beides in
derselben Zeile. Eine Angabe unter zwölf kann zwei Uhrzeiten meinen; gewählt
wird der späteste Zeitpunkt, der noch in der Vergangenheit liegt – um 20 Uhr
ist „halb drei" also der Nachmittag. Gerechnet wird über `zonedTimeToUtc`, nicht
über Millisekunden, sonst läge der Zeitpunkt am Umstellungstag daneben.

**Nachgetragenes wird nicht markiert.** Ob ein Eintrag sofort oder eine Stunde
später erfasst wurde, ändert nichts daran, dass er stattgefunden hat. Eine
Kennzeichnung würde nur eine zweite Klasse von Einträgen schaffen. Nachgetragene
Zeilen gehen durch dieselbe Doppelerfassungs-Prüfung wie alles andere.

**Ein-Tap-Vorschläge erst ab drei gleichen Werten.** Zwei verschiedene Mengen
hintereinander sind kein Muster, sondern Zufall. Ohne Muster bleibt das Feld
leer, statt zu raten.

**Eine kaputte Zeile nimmt die anderen nicht mit.** Wer nachts vier Dinge
nachträgt und bei einer die Zeit vertippt, bekommt die drei anderen gespeichert.
Nachts ist ein Teilerfolg mehr wert als eine Fehlermeldung über allem.

**Die Pause blendet aus, sie löscht nicht.** `featurePauseUntil` schaltet alles
Zusätzliche ab und reduziert die Schnellaktionen auf Stillen, Flasche, Windel
und Schlaf. Die Schalter bleiben stehen und gelten danach wieder; die
Einstellungsseite zeigt während der Pause weiter, was zurückkommt. Die
Notfallkarte und das Stillprotokoll bleiben auch in der Pause erreichbar – etwas
zu verstecken, das im Ernstfall gebraucht wird, wäre der falsche Preis für Ruhe.

**Die Begrüßung erklärt den Zustand, nicht die Funktionen.** `/willkommen`
kommt einmal pro Haushalt und beschreibt, was die App gerade tut und wo mehr
steht. Kein Rundgang: die Aufzählung dessen, was es noch gäbe, wäre selbst
schon der Sog, den die Phase vermeiden soll.

**Kein Prettier in diesem Repo.** Es gibt keine Prettier-Konfiguration, und der
Quelltext ist von Hand gesetzt – ein Lauf über eine bestehende Datei formatiert
sie gegen den Hausstil um. Formatiert wird beim Schreiben, geprüft wird mit
ESLint.

## Phase 12 – Nachbesserungen aus dem echten Betrieb

**Die Vergiftungsinformationszentrale ist keine Verschlucken-Hotline.** Auf der
Notfallkarte stand „Etwas verschluckt? Rund um die Uhr erreichbar." Das war
falsch und im Ernstfall gefährlich: die VIZ berät bei *Verdacht auf Vergiftung*
– Medikamente, Putz- und Haushaltsmittel, Pflanzen, Pilze. Ein Kind, das sich
an einem Fremdkörper verschluckt und keine Luft bekommt, braucht 144. Der Text
sagt das jetzt und verweist ausdrücklich weiter. Belegt über die Gesundheit
Österreich GmbH (Betreiberin der VIZ) und das Gesundheitsportal des
Sozialministeriums; die Quelle steht mit Stand sichtbar auf der Karte, und ein
Test hält fest, dass „verschluckt" dort nicht mehr auftaucht.

**Schwarze Flächen sind kein Kontrast, sondern eine Todesanzeige.** Die beiden
dringenden Nummern waren vollflächig schwarz hinterlegt. Weiß auf Schwarz ist
nicht besser lesbar als Schwarz auf Weiß, sieht aber aus wie eine Traueranzeige.
Jetzt haben alle Karten weißen Grund und schwarze Schrift – den höchsten
Kontrast, den es gibt – und die dringenden heben sich über eine breite
terrakottafarbene Kante ab.

**Fotos werden im Browser verkleinert, bevor sie hochgeladen werden.** Ein
Handyfoto hat vier bis acht Megabyte; der Server rechnete es ohnehin auf 2048
Pixel herunter. Über WLAN fiel der Umweg nicht auf, über Mobilfunk und einen
Tunnel brach die Verbindung ab, bevor das Bild ankam. Verkleinert wird auf
dieselbe Kantenlänge, die am Ende gespeichert wird – kein Qualitätsverlust,
etwa ein Zehntel der Datenmenge. Wo der Browser das Format nicht dekodieren
kann (HEIC auf älteren Geräten), geht das Original raus: lieber langsam als
gar nicht.

**Das Aufnahmedatum wird vor dem Verkleinern gelesen.** Canvas entfernt die
EXIF-Daten. Damit der Datumsvorschlag aus Phase 10.5 nicht verschwindet, sucht
der Browser das Feld selbst und schickt es getrennt mit; der Server prüft es
wie jede Eingabe von außen und nimmt es nur, wenn im Bild selbst keines steht.
Das Datumsmuster liegt in `lib/media/aufnahmezeit.ts` und wird von beiden Seiten
benutzt.

**Ein Bild pro Anfrage.** Gebündelt war ein abgebrochener Upload der Verlust
der ganzen Auswahl. Jetzt scheitert höchstens ein Bild, und man sieht welches.

**Die Fehlermeldung sagt, was passiert ist.** Jeder Fehlschlag – abgelehntes
Format, zu großes Bild, abgebrochene Verbindung, HTML-Antwort eines Proxys –
wurde als „Keine Verbindung zum Server." angezeigt. Das war der Grund, warum
sich das Problem nicht einordnen ließ. Der Statuscode wird jetzt genannt, und
`response.json()` läuft nicht mehr vor der Prüfung auf `response.ok`.

**„Über das Browser-Menü drucken" gab es in der installierten App nie.** Auf
iOS läuft die PWA im Standalone-Modus ohne Adressleiste und ohne Teilen-Knopf –
der Hinweis war genau dort falsch, wo die App am häufigsten benutzt wird.
Stattdessen ein Knopf, der `window.print()` aufruft; iOS öffnet die
AirPrint-Auswahl, und daraus entsteht über „In Dateien speichern" ein PDF. Wo es
ein serverseitig gebautes PDF gibt, steht der Weg daneben.

**Datums- und Zeitfelder auf iOS.** Safari gibt diesen Feldern ein eigenes
Aussehen: der Wert steht mittig, das Feld ignoriert `width: 100%`. Auf dem
iPhone sah der Wert dadurch aus, als wäre er aus dem Rahmen gerutscht. Über
`-webkit-appearance: none` und `::-webkit-date-and-time-value` steht er links
wie in jedem anderen Eingabefeld.

**Einundzwanzig Links in einer Spalte sind keine Liste, sondern eine Wand.**
Unter „Mehr" standen alle Bereiche und alle Einstellungen offen untereinander.
Jetzt stehen die Bereiche als Kacheln in zwei Spalten – halbe Höhe, und man
erkennt ein Ziel am Symbol statt am Zeilenanfang –, und alles, was man einmal
einstellt, liegt hinter einer einzigen Zeile auf `/mehr/einstellungen`. Die
Reihenfolge der Kacheln folgt dem Gebrauch im Wochenbett, nicht dem Alphabet.
Ein Test hält fest, dass beim Umbau kein Einstellungspfad unerreichbar wurde.

**Die Einstellungen sind nicht nach Feature-Schaltern gefiltert.** Eine
Einstellung, die man nicht findet, weil der zugehörige Bereich gerade aus ist,
wäre eine Falle – „Was die App anzeigt" muss immer erreichbar sein.

**Der Server war nie langsam.** Gemessen auf dem fertigen Build mit 400
Ereignissen: 40 bis 170 Millisekunden bis zum ersten Byte, je Seite. Die
gefühlte Zähigkeit kommt aus der Runde durchs Netz – Handy, Cloudflare-Kante,
Tunnel, Server – die bei jedem Tab-Wechsel neu anfiel. Dagegen helfen drei
Dinge, die alle nichts am Server ändern: `staleTimes` hält eine besuchte Seite
30 Sekunden im Router-Cache (der SSE-Strom verwirft ihn, sobald die andere
Person etwas einträgt), die fünf Ziele der Tab-Leiste werden vorgeladen, und
die beiden Schriften werden vorgeladen, damit der Text nicht erst in der
Systemschrift erscheint und dann umspringt.

**Kein `loading.tsx` auf Gruppenebene.** Der erste Versuch hatte eines: ein
graues Gerüst, das beim Wechsel sofort erscheint. Gemessen an
`e2e/api.spec.ts` (12 Tests) war das ein Desaster – 36 Sekunden und 12 grün
vorher, 5 Minuten 41 und 7 grün danach; ohne die Datei wieder 38 Sekunden und
12 grün. Eine Datei auf Ebene der `(app)`-Gruppe legt jede Seite in eine
Suspense-Grenze, und das kostet weit mehr, als es einbringt. Es wäre auch die
schlechtere Bedienung gewesen: bei jedem Tab-Wechsel erst graue Rechtecke, auf
einer schnellen Verbindung ein Flackern statt eines Gewinns. Der Prefetch, der
zwischenzeitlich verdächtigt wurde, kostet dagegen nichts messbares (34
Sekunden mit, 38 ohne) und bleibt.

**Ein Befehl für die E2E-Tests.** `npm run test:e2e` zieht die Datenbank hoch,
migriert, baut, startet den Server, testet und räumt auf. Die Datenbank wird in
dieser Reihenfolge gesucht: `E2E_DATABASE_URL`, dann ein Wegwerf-Container über
Docker, dann ein laufender Postgres aus `DATABASE_URL`. Findet sich keine,
bricht das Skript ab und nennt alle drei Wege – statt in einen Timeout zu
laufen, in dem man raten muss, was fehlt. `globalTimeout` steht auf 15 Minuten:
der ganze Satz braucht acht, und ein Abbruch mit Bericht ist mehr wert als eine
Warteschleife.

**`reuseExistingServer` steht auf `false`.** Ein Server aus einem früheren Lauf
liefert Chunks einer alten Build-ID aus. Im Browser sieht das aus wie
„Application error: a client-side exception", und die Fehlersuche landet an
Stellen, die in Ordnung sind – einmal einen halben Nachmittag lang. Die paar
Sekunden Startzeit sind das billigere Ende.

## Phase 13 – Drucken, Teilen, Fieber eintragen

**Der Fieberbereich bekommt seinen eigenen Eintrag.** „Temperatur eintragen"
war ein Link auf `/heute`. Dort landet man auf dem Dashboard und muss sich den
Weg über „Etwas anderes eintragen" → „Gesundheit" selbst suchen – drei Taps,
von denen keiner angekündigt war. Der Knopf öffnet jetzt den Dialog direkt, und
er steht auch während einer laufenden Episode auf der Seite: nachgemessen wird
mehrmals, und der Weg dorthin gehört dahin, wo man gerade ist.

**`window.print()` gibt es in der installierten App auf dem iPhone nicht.** Im
Standalone-Modus bleibt der Aufruf wirkungslos – kein Fehler, keine Rückmeldung,
nichts. Der frühere Kommentar an dieser Stelle behauptete das Gegenteil; das war
falsch und ungeprüft. Auch ein `download`-Link führt dort ins Leere: es gibt
kein Downloadmenü und kein Teilen-Blatt. Beides zusammen heißt: Die beiden
Wege, auf denen bisher etwas aus der App herauskam, funktionieren ausgerechnet
dort nicht, wo die App zu 95 % benutzt wird.

**Jede Druckansicht liefert jetzt ein PDF.** Fieber-Arztzettel, Jahresrückblick,
Etikettenbogen und Zahnschema haben eigene Bauroutinen bekommen, wie das
Stillprotokoll sie schon hatte. Ein serverseitig gebautes PDF ist verlässlicher
als das, was der Browser aus der Seite macht – beim Etikettenbogen ist es sogar
die einzige Möglichkeit, die 70 × 37 mm zu treffen, weil der Browser den
Ausdruck nach eigenem Gutdünken skaliert.

**PDFs gehen `inline` heraus, nicht als `attachment`, und werden in einem neuen
Tab geöffnet.** Damit landet man im PDF-Betrachter des Browsers, und dort führt
der Teilen-Knopf zu Drucken, „In Dateien sichern" und AirDrop. Das ist der
einzige Weg, der auf allen drei Geräten gleich funktioniert.

**Der Drucken-Knopf erscheint nur, wo er etwas bewirkt.** `src/lib/pwa/umgebung.ts`
prüft auf iOS im Standalone-Modus und lässt ihn dort weg – erst nach dem
Einhängen, weil der Server nicht wissen kann, woran die App läuft. Ein Knopf,
der nichts tut, ist schlimmer als keiner. Auf Android, am Rechner und im Safari
auf demselben iPhone steht er weiterhin.

**Das Zahnschema wird auf Papier eine Liste.** Am Bildschirm ist der gezeichnete
Kiefer das Hilfreiche: man tippt den Zahn an, den man meint. Auf Papier zählt
die andere Frage – wann kam welcher Zahn –, und dafür ist eine Tabelle das
bessere Format. Aufgeführt wird nur, was eingetragen ist; zwanzig leere Zeilen
läsen sich wie eine Mängelliste.

**Der Rückblick nimmt die Fotos mit.** Er ist das eine Dokument aus dieser App,
das jemand ausdruckt, um es aufzuheben – deshalb in Farbe und mit Bildern,
anders als Stillprotokoll und Arztzettel. Gespeichert wird WebP, einbetten kann
`pdf-lib` nur JPEG und PNG, also kodiert die Route um. Ein Bild, das fehlt oder
sich nicht lesen lässt, fällt still weg.

**Laden steht jetzt an einer Stelle.** Fieberdaten und Rückblick wurden von der
Seite und vom PDF getrennt abgefragt. Zwei Abfragen für dieselbe Ansicht laufen
auseinander, sobald eine davon angepasst wird – jetzt teilen sie sich
`src/lib/fever/daten.ts` bzw. `src/lib/export/rueckblick.ts`.

**„+0,0 kg" fällt weg.** Der Rückblick zeigte bei genau einer Gewichtsmessung
eine Zunahme von null an, weil erste und letzte Messung dieselbe waren. Eine
Zahl, die etwas behauptet, was niemand gemessen hat. Ab zwei Messungen steht
sie wieder da.

**`server-only` ist in den Tests ein leeres Modul.** Das echte Paket wirft beim
Import, damit ein Server-Modul nicht im Browser-Bündel landet. In Vitest gibt es
diese Trennung nicht, und ohne den Ersatz ließe sich kein einziger PDF-Baustein
prüfen. Der Alias steht in `vitest.config.ts` und gilt nur dort.

**Begrenzt wird beim Verlassen des Feldes, nicht beim Tippen.** Wer bei einem
Feld von 30 bis 45 die „38" eintippte, bekam 45: Nach der ersten Ziffer stand
eine 3 im Feld, die sofort auf das Minimum 30 hochgezogen wurde, und die zweite
Ziffer machte daraus 308 und damit das Maximum. Während des Tippens gilt jetzt,
was im Feld steht; gerechnet und begrenzt wird erst beim Verlassen.

**Plus und Minus laufen beim Halten weiter.** Nach 0,4 Sekunden alle 90
Millisekunden ein Schritt, ab der achten Wiederholung fünf Schritte auf einmal.
Am Anfang fein, damit ein einzelner Schritt noch trifft; danach grob, damit 36
auf 40 Grad keine vierzig Taps braucht. Der Takt liest den Wert aus einer
Referenz, nicht aus dem Abschluss – sonst rechnete jeder Schritt vom selben
Ausgangswert und die Zahl bliebe stehen. Für die Tastatur bleibt ein
`onClick`, das nur bei `detail === 0` zählt: Enter und Leertaste lösen keinen
Zeiger aus.

**Das PDF geht ans Teilen-Blatt, nicht in einen neuen Tab.** Der neue Tab war
die falsche Antwort: In der vom Startbildschirm gestarteten App gibt es keine
Bedienleiste, also öffnet sich das PDF dort innerhalb der App und steht
bildschirmfüllend da – ohne Teilen, ohne Drucken, ohne Zurück. Über
`navigator.share` mit der Datei kommt das Teilen-Blatt des Geräts, und dort gibt
es Drucken, „In Dateien sichern", AirDrop und Mail. Wo der Browser keine Dateien
teilen kann – am Rechner, auf Android –, bleibt der neue Tab; dort ist er das
Richtige.

**Ein zweiter Tap ist eingeplant.** `navigator.share` verlangt eine frische
Nutzergeste. Zwischen dem Antippen und dem Aufruf liegt aber das Laden des PDFs,
und darüber kann die Geste verfallen (`NotAllowedError`). Die geladene Datei
bleibt deshalb liegen, und der Knopf bittet um einen zweiten Tap, statt einen
Fehler zu melden – beim zweiten Mal liegt sie bereit und es geht sofort.
Weitergegeben wird nur die Datei, ohne Titel: Mit beidem gibt iOS teils den Text
weiter statt der Datei.

**Die Filterreihe im Verlauf bleibt stehen.** Sie scrollte mit der Liste nach
oben weg und lag dabei hinter der durchscheinenden Kopfzeile: halb zu sehen und
in der oberen Hälfte nicht mehr antippbar – ein 48-Pixel-Ziel, von dem nur
zwanzig übrig blieben. Jetzt klebt sie direkt unter der Kopfzeile, auf
deckendem Grund. Die Höhe der Kopfzeile steht als Klasse `.unter-kopf` in
`globals.css`; geraten stimmt sie auf einem iPhone mit Insel nicht, weil der
Sicherheitsabstand oben dazukommt.

**Der gewählte Filter wird in den Blick geholt.** Zehn Arten passen nicht
nebeneinander, und wer nach „Abpumpen" gefiltert hat, sah beim Zurückkommen
eine Reihe, die vorne bei „Alles" anfängt – ohne Hinweis darauf, was gerade
gilt. Beim Öffnen scrollt die Reihe zur gewählten Art. Senkrecht bleibt sie
dabei stehen (`block: nearest`), sonst springt die ganze Seite.

**Gewählt heißt gefüllt.** Vorher war der aktive Filter nur zart getönt
(`bg-primary/10`). Nachts, bei heruntergedrehter Helligkeit, ist das kein
Unterschied. Jetzt ist er ausgefüllt.

**Die Kreisuhr hatte ihre Stundenbeschriftungen ausserhalb der Zeichenfläche.**
Bei 300 Einheiten Kantenlänge und einem Beschriftungsradius von 158 lag
„00:00" bei y = −8, „12:00" bei y = 308, „06:00" bei x = 308 und „18:00" bei
x = −8. Alle vier wurden abgeschnitten. Die Fläche ist jetzt 340 Einheiten
groß; links und rechts hängen die Beschriftungen an ihrem äußeren Ende statt
mittig über dem Strich, weil „18:00" bei 13 Pixeln rund 36 Einheiten breit ist
und mittig gesetzt wieder die Hälfte davon herausragen würde.

**Einträge ohne Dauer sind Marken, keine Bögen.** Eine Windel bekam sechs
Minuten Mindestbreite – im Windelring sind das 1,9 Einheiten, also knapp zwei
Pixel. Das sieht niemand und trifft erst recht niemand. Jetzt ist es ein Punkt
von 15 Pixeln Durchmesser an der richtigen Uhrzeit, was der Sache auch näher
kommt: Der Eintrag *ist* ein Zeitpunkt, keine Dauer.

**Ausgewählt wird über den Ring, nicht über den Bogen.** Der Tap sagt nur, in
welchem Ring und zu welcher Uhrzeit er lag; welcher Eintrag gemeint war,
rechnet `segmentBeiMinute` aus – innerhalb von 25 Minuten gewinnt der nächste,
darüber hinaus wird nichts ausgewählt. Damit muss niemand mehr den Bogen selbst
treffen. Die Umkehrrechnung (`minuteAusPunkt`, `ringFuerRadius`) steht in
`day-segments.ts` und ist geprüft; in der Komponente wäre sie es nicht.

**Kein Ring ist dünner als 22 Einheiten.** Der innerste hatte 12. Vier Ringe auf
einer Scheibe sind ohnehin eng; wenn einer davon so schmal ist, dass ein
Eintrag darin zum Haarstrich wird, ist er als Ring nichts wert.

## Phase 14 – Datenherkunft

**Zwei Wochen statt sechs Monate fürs Gefrierfach.** Der Lagerort „Gefrierfach"
trug die Haltbarkeit einer Tiefkühltruhe. Die CDC trennt beides ausdrücklich:
Das Fach im Kühlschrank hält die −18 °C nicht durchgehend, weil die Tür
mehrmals täglich aufgeht. Sechs Monate an dieser Stelle heißt im schlechtesten
Fall verdorbene Milch – die Vorgabe ist jetzt die vorsichtige, und wer ein Fach
mit echten −18 °C hat, stellt sie höher.

**Nichts umnummeriert, was zwei Recherchen unterschiedlich sagen.** Bei den
Eltern-Kind-Pass-Untersuchungen deutet vieles darauf hin, dass die Nummerierung
ab der vierten um eins verschoben ist. Zwei Suchen widersprachen sich aber, und
die Originalseiten sind aus dieser Umgebung gesperrt. Eine Zahl zu ändern, weil
sie wahrscheinlich stimmt, wäre genau das Erfinden, das hier verboten ist. Der
Verdacht steht stattdessen wörtlich im Prüfhinweis, den die App über der
Vorsorgeseite anzeigt.

**`kostenfrei` im Impfplan bleibt stehen, obwohl es vermutlich falsch ist.**
Für Varizellen und die Kinder-Influenza spricht viel dafür, dass sie inzwischen
im kostenfreien Kinderimpfprogramm sind. Eine Zusammenfassung ist aber kein
Impfplan. Auch das steht im Prüfhinweis.

**`DATENHERKUNFT.md` statt Quellenangaben nur im Quelltext.** Die Herkunft stand
bisher verstreut in Dateikommentaren. Wer wissen will, ob er einer Zahl trauen
kann, soll das an einer Stelle nachlesen können – und sehen, was geprüft ist und
was nicht.
