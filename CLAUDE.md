# Sprössling – Arbeitsanleitung

Self-hosted Baby- und Schwangerschafts-Tracker für genau zwei Personen
(ein Haushalt, Echtzeit-Sync). Bedienung zu 95 % am Handy, oft einhändig und
nachts. **Bedienbarkeit schlägt Funktionsumfang.**

## Stack

| Bereich | Wahl |
|---|---|
| Framework | Next.js 15 (App Router, RSC), TypeScript `strict` + `noUncheckedIndexedAccess` |
| Datenbank | PostgreSQL 16 + Prisma |
| UI | Tailwind CSS 3, shadcn/ui-Bausteine in `src/components/ui`, lucide-react |
| Auth | eigenes Session-Cookie (argon2id, httpOnly, SameSite=Lax), Registrierung nur per Einladungscode |
| Realtime | Postgres `LISTEN/NOTIFY` → SSE (`/api/realtime`) → `router.refresh()` |
| Offline | Serwist-PWA, Schreib-Queue in IndexedDB, Sync bei Reconnect |
| Push | Web Push (VAPID), optional zusätzlich ntfy-Webhook |
| Charts | Recharts |
| Tests | Vitest (Unit, Ziel > 80 % auf `src/lib`), Playwright (E2E) |

## Befehle

```bash
npm run dev          # Entwicklungsserver
npm run build        # Prisma generate + Next-Build
npm run start        # Produktionsserver
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm test             # Vitest einmalig
npm run test:coverage
npm run test:e2e     # Playwright (baut vorher nicht selbst – erst `npm run build`)
npm run check        # lint + typecheck + test
npm run db:migrate   # Migration in der Entwicklung
npm run db:deploy    # Migrationen in Produktion
npm run db:seed      # Haushalt + Bootstrap-Einladungscode
```

## Ordnerstruktur

```
src/
  app/
    (auth)/            Anmeldung und Registrierung
    (app)/             Alles hinter der Anmeldung (Layout mit Header + Tab-Leiste)
                       `/` leitet auf den eingestellten Startbildschirm,
                       das Dashboard selbst liegt auf `/heute`
    api/               Route Handler (SSE, Health, Uploads, Push, Export …)
  components/
    ui/                shadcn-Bausteine (Button, Card, Dialog …)
    layout/            Header, Tab-Leiste, Kind-Umschalter
    tracker/           Timer, Schnellaktionen, Event-Listen
    dashboard/         24h-Kreisuhr, Schlafdruck, Vorhersage-Karten
  lib/
    auth/              Passwort, Session, CSRF, Rate-Limit
    events/            Zod-Schemas und Helfer für den polymorphen Event-Typ
    sleep/             Wachfenster-Modell, Vorhersage, Schlafdruck
    growth/            WHO-LMS-Daten und Perzentil-Rechnung
    stats/             Aggregationen für die Auswertungen
    content/           Wochen-Content, Sprünge, Übungen, Meilensteine
    parents/           Eltern-Signal und Unterstützungskontakte
    settings/          Startbildschirm, Schnellaktionen, Bestätigungswort
    backup/            Lesezugriff auf das Backup-Volume
    units.ts           Einheiten-Umrechnung für die Anzeige (Speicher: metrisch)
    actions/           Server Actions
content/weeks/de/      Woche-für-Woche-Inhalte (Markdown + Frontmatter)
prisma/                Schema, Migrationen, Seed
docker/                Entrypoint, Backup-Sidecar
e2e/                   Playwright-Tests
```

## Konventionen

- **Sprache:** UI durchgehend Deutsch, informelles „du“. Code, Kommentare und
  Commits ebenfalls Deutsch, außer Fachbegriffe. i18n-Struktur ist vorbereitet,
  ausgeliefert wird nur `de`.
- **Zeit:** In der DB immer UTC. Anzeige in `Europe/Vienna` über `src/lib/time.ts`,
  24-Stunden-Format. Niemals `new Date().getHours()` für Anzeigezwecke.
- **Touch-Ziele:** mindestens 48 px (`h-12`). Wichtige Aktionen gehören nach oben
  bzw. unten in Daumenreichweite, nicht in die Bildschirmmitte.
- **Jede Aktion ist umkehrbar.** Löschen ist ein Soft-Delete (`deletedAt`), jede
  Änderung schreibt eine `EventRevision`.
- **Zuschreibung:** Jeder Eintrag zeigt über `UserAvatar`, wer ihn erfasst hat.
- **Server Actions** geben `{ error: string }` statt zu werfen, wenn der Fehler
  in der UI landen soll. Alle Eingaben werden mit zod validiert.
- **Kein Placeholder-Code.** Was in einer Phase steht, ist fertig.
- **Keine externen Requests zur Laufzeit** – keine CDNs, keine Tracker,
  Schriften liegen unter `public/fonts`.

## Medizinische Inhalte

Alle Texte sind selbst formuliert. Datensätze stammen ausschließlich aus offen
lizenzierten Quellen (WHO Child Growth Standards). Jede Auswertung mit
medizinischem Anschein (Wehen, Perzentile, Wachfenster) trägt einen kurzen
Hinweis, dass sie Hebamme und Ärztin nicht ersetzt.
