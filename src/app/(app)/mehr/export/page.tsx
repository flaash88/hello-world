import type { Metadata } from 'next'
import { Download, FileJson, FileSpreadsheet, FileText } from 'lucide-react'
import { getAppContext } from '@/lib/household'
import { currentFeatures } from '@/lib/settings/features-server'
import { EVENT_CATEGORIES, EVENT_TYPES } from '@/lib/events/types'
import { BackLink } from '@/components/layout/back-link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Export' }

export default async function ExportPage() {
  const ctx = await getAppContext()
  const features = await currentFeatures()
  const childId = ctx.activeChild?.id
  // Der Wochenbericht ist eine Auswertung und haengt am selben Schalter. Die
  // Rohdaten darunter nicht: die gehoeren euch immer.
  const wochenbericht = features.aktiv.has('auswertung')

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/mehr" label="Mehr" />
      <h1 className="font-display text-2xl font-bold">Export</h1>
      <p className="text-muted-foreground">
        Eure Daten gehören euch. Alles hier lässt sich ohne Sprössling weiterverwenden.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileJson className="size-4 text-muted-foreground" aria-hidden />
            Vollständiges Backup
          </CardTitle>
          <CardDescription>
            Alles als JSON: Kind, Schwangerschaft, Einträge, Messungen, Meilensteine, Tagebuch.
            Passwörter, Sitzungen und Einladungscodes sind bewusst nicht enthalten.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <a
            href="/api/export/json"
            download
            className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground"
          >
            <Download className="size-5" aria-hidden />
            Backup herunterladen
          </a>
          <a
            href="/api/export/json?privat=1"
            download
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-border px-4 text-sm font-semibold"
          >
            Mit meinem privaten Tagebuch
          </a>
        </CardContent>
      </Card>

      {childId && (
        <>
          {wochenbericht && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="size-4 text-muted-foreground" aria-hidden />
                  Wochenbericht als PDF
                </CardTitle>
                <CardDescription>
                  Eine Seite mit den Zahlen der Woche – gut zum Ausdrucken oder für den Termin bei
                  der Kinderärztin.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <a
                  href={`/api/export/pdf?kind=${childId}`}
                  download
                  className="flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 border-border px-4 font-semibold"
                >
                  <Download className="size-5" aria-hidden />
                  Diese Woche
                </a>
                <a
                  href={`/api/export/pdf?kind=${childId}&offset=-1`}
                  download
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-border px-4 text-sm font-semibold"
                >
                  Vorige Woche
                </a>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSpreadsheet className="size-4 text-muted-foreground" aria-hidden />
                CSV je Kategorie
              </CardTitle>
              <CardDescription>
                Semikolon-getrennt mit Dezimalkomma – öffnet sich in Excel und LibreOffice direkt
                richtig.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid grid-cols-2 gap-2">
                {EVENT_TYPES.map((type) => (
                  <li key={type}>
                    <a
                      href={`/api/export/csv?typ=${type}&kind=${childId}`}
                      download
                      className="flex min-h-12 items-center justify-center rounded-lg border border-border px-3 text-sm font-semibold"
                    >
                      {EVENT_CATEGORIES[type].label}
                    </a>
                  </li>
                ))}
                <li className="col-span-2">
                  <a
                    href={`/api/export/csv?typ=wachstum&kind=${childId}`}
                    download
                    className="flex min-h-12 items-center justify-center rounded-lg border border-border px-3 text-sm font-semibold"
                  >
                    Wachstumsmessungen
                  </a>
                </li>
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
