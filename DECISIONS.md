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
