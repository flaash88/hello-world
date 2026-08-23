import type { Kopf } from '@/lib/print/kopf'

/**
 * Kopfzeile fuer Druckansichten im Browser.
 *
 * Dieselben Felder wie im PDF (siehe `src/lib/print/kopf.ts`), damit der
 * ausgedruckte Zettel und die heruntergeladene Datei nicht unterschiedlich
 * aussehen.
 */
export function PrintHeader({ kopf }: { kopf: Kopf }) {
  return (
    <header className="flex flex-col gap-2">
      {/* Auf dem Bildschirm sagt die Seitenueberschrift schon, was das ist –
          auf dem Papier gibt es die nicht, deshalb steht der Titel nur dort. */}
      <h2 className="hidden font-display text-lg font-bold print:block">{kopf.titel}</h2>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {kopf.felder.map((feld) => (
          <div key={feld.label}>
            <dt className="text-muted-foreground print:text-black">{feld.label}</dt>
            <dd className="font-semibold">{feld.wert}</dd>
          </div>
        ))}
      </dl>
    </header>
  )
}
