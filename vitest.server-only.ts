/**
 * Ersatz für das Paket `server-only` in den Unit-Tests.
 *
 * Das echte Paket wirft beim Import einen Fehler, damit ein Server-Modul nicht
 * versehentlich im Browser-Bündel landet. In Vitest gibt es diese Trennung
 * nicht; ohne diesen Ersatz ließe sich kein einziges Server-Modul testen –
 * und ausgerechnet die PDF-Bausteine sind welche.
 */
export {}
