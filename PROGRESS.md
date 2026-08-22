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
