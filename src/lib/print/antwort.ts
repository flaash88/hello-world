import 'server-only'

/**
 * Ein fertiges PDF ausliefern.
 *
 * `inline` statt `attachment`, und das ist der ganze Punkt: In der installierten
 * App auf dem iPhone passiert bei einem Download nichts Sichtbares – es gibt
 * kein Downloadmenü, keine Dateiliste und kein Teilen-Blatt. Inline zeigt der
 * Browser das PDF in seinem Betrachter, und dort führt der Teilen-Knopf zu
 * Drucken, „In Dateien sichern" und AirDrop.
 *
 * Der Dateiname bleibt trotzdem stehen: Er wird übernommen, sobald jemand das
 * PDF doch speichert.
 */
export function pdfAntwort(bytes: Uint8Array, dateiname: string): Response {
  return new Response(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${dateiname}"`,
      'Cache-Control': 'no-store',
    },
  })
}
