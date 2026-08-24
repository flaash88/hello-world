'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import { tagesEreignisseAction, type TagesEreignisRow } from '@/lib/actions/protokoll'
import { PROTOKOLL_TAGE } from '@/lib/protokoll/days'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { UserAvatar } from '@/components/ui/avatar'
import { PrintButton } from '@/components/print/print-button'
import { PrintHeader } from '@/components/print/print-header'
import { cn } from '@/lib/utils'
import type { ProtokollDaten, ZeileView } from './types'

const SPALTEN = [
  { key: 'tag', titel: 'Tag', kurz: 'Tag' },
  { key: 'lt', titel: 'Lebenstag', kurz: 'LT' },
  { key: 'anlegen', titel: 'Anlegen', kurz: 'Anl.' },
  { key: 'dauer', titel: 'Durchschnittliche Dauer', kurz: '⌀ Dauer' },
  { key: 'flasche', titel: 'Flasche', kurz: 'Fla.' },
  { key: 'ml', titel: 'Milliliter', kurz: 'ml' },
  { key: 'nass', titel: 'Nasse Windeln', kurz: 'Nass' },
  { key: 'voll', titel: 'Volle Windeln', kurz: 'Voll' },
  { key: 'schlaf', titel: 'Schlaf', kurz: 'Schlaf' },
  { key: 'gewicht', titel: 'Gewicht', kurz: 'Gewicht' },
] as const

/**
 * Das Protokoll fuer den Hausbesuch. Eine Tabelle, sonst nichts – die Hebamme
 * soll in zehn Sekunden sehen, was war, und nicht durch Karten scrollen.
 */
export function ProtokollAnsicht({ daten }: { daten: ProtokollDaten }) {
  const [offen, setOffen] = useState<ZeileView | null>(null)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-bold">Stillprotokoll</h1>
          <p className="text-muted-foreground">Für den Besuch der Hebamme.</p>
        </div>
      </div>

      <nav className="flex gap-2 print:hidden" aria-label="Zeitraum">
        {PROTOKOLL_TAGE.map((tage) => (
          <Link
            key={tage}
            href={`/protokoll?tage=${tage}`}
            aria-current={daten.tage === tage ? 'page' : undefined}
            className={cn(
              'flex min-h-12 flex-1 items-center justify-center rounded-lg border-2 font-semibold',
              daten.tage === tage ? 'border-primary bg-primary/10' : 'border-border',
            )}
          >
            {tage === 1 ? 'Heute' : `${tage} Tage`}
          </Link>
        ))}
      </nav>

      <PrintHeader kopf={daten.kopf} />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm" data-testid="protokoll-tabelle">
          <caption className="sr-only">
            Ein Tag je Zeile, neueste oben. Leere Zellen bedeuten: nichts eingetragen.
          </caption>
          <thead>
            <tr className="border-b-2 border-border text-left">
              {SPALTEN.map((spalte) => (
                <th
                  key={spalte.key}
                  scope="col"
                  className="whitespace-nowrap py-2 pr-2 text-xs font-bold uppercase tracking-wide text-muted-foreground"
                >
                  <abbr title={spalte.titel} className="no-underline">
                    {spalte.kurz}
                  </abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {daten.zeilen.map((zeile) => (
              <tr
                key={zeile.dayKey}
                onClick={() => zeile.hatEintraege && setOffen(zeile)}
                className={cn(
                  'border-b border-border tabular',
                  zeile.hatEintraege && 'cursor-pointer hover:bg-accent print:hover:bg-transparent',
                )}
              >
                <th scope="row" className="whitespace-nowrap py-2 pr-2 text-left font-semibold">
                  {zeile.wochentag} {zeile.tagText}
                </th>
                <td className="py-2 pr-2">{zeile.lebenstag}</td>
                <td className="py-2 pr-2">{zeile.anlegen}</td>
                <td className="whitespace-nowrap py-2 pr-2">{zeile.stillDauer}</td>
                <td className="py-2 pr-2">{zeile.flasche}</td>
                <td className="py-2 pr-2">{zeile.flascheMl}</td>
                <td className="py-2 pr-2">{zeile.windelnNass}</td>
                <td className="py-2 pr-2">{zeile.windelnVoll}</td>
                <td className="whitespace-nowrap py-2 pr-2">{zeile.schlaf}</td>
                <td className="whitespace-nowrap py-2">{zeile.gewicht}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border font-semibold tabular">
              <th scope="row" className="whitespace-nowrap py-2 pr-2 text-left">
                ⌀ pro Tag
              </th>
              <td className="py-2 pr-2" />
              <td className="py-2 pr-2">{daten.schnitt.anlegen}</td>
              <td className="whitespace-nowrap py-2 pr-2">{daten.schnitt.stillDauer}</td>
              <td className="py-2 pr-2">{daten.schnitt.flasche}</td>
              <td className="py-2 pr-2">{daten.schnitt.flascheMl}</td>
              <td className="py-2 pr-2">{daten.schnitt.windelnNass}</td>
              <td className="py-2 pr-2">{daten.schnitt.windelnVoll}</td>
              <td className="whitespace-nowrap py-2 pr-2">{daten.schnitt.schlaf}</td>
              <td className="py-2" />
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Anlegen zählt Stillvorgänge, nicht Seiten. Eine Windel mit beidem zählt in beide Spalten.
        Leere Zellen heißen: nichts eingetragen.
      </p>

      <PrintButton
        pdfHref={`/api/protokoll/pdf?tage=${daten.tage}&kind=${daten.childId}`}
        pdfLabel="Als PDF herunterladen"
      />

      <TagDialog childId={daten.childId} zeile={offen} onClose={() => setOffen(null)} />
    </div>
  )
}

/** Was hinter einer Zeile steckt – erst auf Antippen geladen. */
function TagDialog({
  childId,
  zeile,
  onClose,
}: {
  childId: string
  zeile: ZeileView | null
  onClose: () => void
}) {
  const [rows, setRows] = useState<TagesEreignisRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const dayKey = zeile?.dayKey ?? null

  // Nachladen gehoert in einen Effekt, nicht in den Render – sonst faengt der
  // Dialog an, sich waehrend des Zeichnens selbst zu aktualisieren.
  useEffect(() => {
    if (!dayKey) return
    let abgebrochen = false
    setRows(null)
    setError(null)

    void tagesEreignisseAction(childId, dayKey).then((result) => {
      if (abgebrochen) return
      if ('error' in result) setError(result.error)
      else setRows(result)
    })

    return () => {
      abgebrochen = true
    }
  }, [childId, dayKey])

  return (
    <Dialog
      open={Boolean(zeile)}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {zeile ? `${zeile.wochentag} ${zeile.tagText}` : ''}
            {zeile?.lebenstag ? ` · Lebenstag ${zeile.lebenstag}` : ''}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        {rows === null && !error ? (
          <p className="py-4 text-sm text-muted-foreground">Wird geladen …</p>
        ) : rows && rows.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">An diesem Tag steht nichts.</p>
        ) : (
          <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto">
            {rows?.map((row) => (
              <li key={row.id} className="flex items-start gap-3 border-b border-border pb-2">
                <span className="w-12 shrink-0 text-sm tabular text-muted-foreground">
                  {row.zeit}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{row.art}</span>
                  {row.detail && (
                    <span className="block text-sm text-muted-foreground">{row.detail}</span>
                  )}
                </span>
                {row.wer && (
                  <UserAvatar
                    initials={row.wer.initials}
                    color={row.wer.color}
                    title={row.wer.displayName}
                  />
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <FileText className="size-3.5" aria-hidden />
          Ändern lässt sich das im Verlauf.
        </p>
      </DialogContent>
    </Dialog>
  )
}
