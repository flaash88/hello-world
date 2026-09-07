'use client'
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import {
  ladeVorschlaegeAction,
  nachtragenAction,
  type Vorschlaege,
} from '@/lib/actions/nachtragen'
import {
  NACHTRAG_TYPEN,
  zeitBestaetigung,
  zeitEingabe,
} from '@/lib/tracker/nachtragen'
import {
  DIAPER_KIND_LABEL,
  EVENT_CATEGORIES,
  NURSING_SIDE_LABEL,
  type EventType,
} from '@/lib/events/types'
import { APP_TIMEZONE } from '@/lib/time'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

type Zeile = {
  /** Nur für React – kommt nie an den Server. */
  key: number
  type: EventType
  /** Rohtext, so wie getippt: „vor 2 Stunden" oder „halb drei". */
  zeit: string
  /** Menge in ml, wo die Kategorie eine kennt. */
  menge: string
  /** Seite beim Stillen bzw. Art der Windel. */
  variante: string | null
}

let naechsterKey = 1

function neueZeile(type: EventType, vorschlaege: Vorschlaege | null): Zeile {
  return {
    key: naechsterKey++,
    type,
    zeit: '',
    menge:
      type === 'bottle' && vorschlaege?.flascheMl
        ? String(vorschlaege.flascheMl)
        : type === 'pumping' && vorschlaege?.pumpenMl
          ? String(vorschlaege.pumpenMl)
          : '',
    variante:
      type === 'nursing'
        ? (vorschlaege?.stillSeite ?? null)
        : type === 'diaper'
          ? (vorschlaege?.windelArt ?? null)
          : null,
  }
}

/**
 * Mehreres in einem Durchgang nachtragen.
 *
 * Eine Liste, in jeder Zeile Art und Zeit – keine Zwischenschritte, kein
 * Assistent, kein Zeitwähler. Die Zeit wird getippt, wie man sie sagt.
 * Nachgetragenes ist nachher von sofort Erfasstem nicht zu unterscheiden.
 */
export function NachtragSheet({ childId, timezone }: { childId: string; timezone?: string }) {
  const tz = timezone ?? APP_TIMEZONE
  const [offen, setOffen] = useState(false)
  const [vorschlaege, setVorschlaege] = useState<Vorschlaege | null>(null)
  const [zeilen, setZeilen] = useState<Zeile[]>([])
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()
  const jetzt = new Date()

  useEffect(() => {
    if (!offen) return
    let abgebrochen = false
    void ladeVorschlaegeAction(childId).then((geladen) => {
      if (abgebrochen) return
      setVorschlaege(geladen)
      setZeilen((vorher) => (vorher.length > 0 ? vorher : [neueZeile('nursing', geladen)]))
    })
    return () => {
      abgebrochen = true
    }
  }, [offen, childId])

  function aendere(key: number, patch: Partial<Zeile>) {
    setZeilen((alle) => alle.map((zeile) => (zeile.key === key ? { ...zeile, ...patch } : zeile)))
  }

  function speichern() {
    const fertig = zeilen
      .map((zeile) => {
        const zeit = zeitEingabe(zeile.zeit, new Date(), tz)
        if (!zeit) return null
        const menge = Number(zeile.menge.replace(',', '.'))
        const payload: Record<string, unknown> = {}
        if (zeile.type === 'bottle' || zeile.type === 'pumping') {
          if (Number.isFinite(menge) && menge > 0) payload.amountMl = menge
        }
        if (zeile.type === 'nursing' && zeile.variante) payload.side = zeile.variante
        if (zeile.type === 'diaper' && zeile.variante) payload.kind = zeile.variante
        return {
          type: zeile.type,
          startedAt: zeit.toISOString(),
          payload: Object.keys(payload).length > 0 ? payload : undefined,
        }
      })
      .filter((zeile): zeile is NonNullable<typeof zeile> => zeile !== null)

    if (fertig.length === 0) {
      toast({
        title: 'Noch keine Zeit erkannt',
        description: 'Zum Beispiel \u201Evor 2 Stunden\u201C oder \u201Ehalb drei\u201C.',
        variant: 'destructive',
      })
      return
    }

    startTransition(async () => {
      const result = await nachtragenAction({ childId, zeilen: fertig })
      if ('error' in result) {
        toast({ title: 'Nicht gespeichert', description: result.error, variant: 'destructive' })
        return
      }
      toast({
        title: result.angelegt === 1 ? 'Eingetragen' : `${result.angelegt} Einträge angelegt`,
      })
      setZeilen([])
      setOffen(false)
      router.refresh()
    })
  }

  return (
    <>
      <Button variant="outline" className="h-12 w-full" onClick={() => setOffen(true)}>
        <Plus aria-hidden />
        Mehreres nachtragen
      </Button>

      <Dialog open={offen} onOpenChange={setOffen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mehreres nachtragen</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Die Zeit so eintippen, wie man sie sagt: {'\u201Evor 2 Stunden\u201C'},{' '}
              {'\u201Ehalb drei\u201C'}, {'\u201E02:30\u201C'}.
            </p>

            {zeilen.map((zeile) => {
              const zeit = zeitEingabe(zeile.zeit, jetzt, tz)
              return (
                <div key={zeile.key} className="flex flex-col gap-2 rounded-xl border border-border p-3">
                  <div className="flex flex-wrap gap-1.5">
                    {NACHTRAG_TYPEN.map((type) => (
                      <button
                        key={type}
                        type="button"
                        aria-pressed={zeile.type === type}
                        onClick={() => aendere(zeile.key, { ...neueZeile(type, vorschlaege), key: zeile.key, zeit: zeile.zeit })}
                        className={cn(
                          'min-h-10 rounded-lg border px-3 text-sm font-semibold',
                          zeile.type === type
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-card',
                        )}
                      >
                        {EVENT_CATEGORIES[type].label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="min-w-0 flex-1">
                      <Label htmlFor={`zeit-${zeile.key}`} className="text-xs">
                        Wann
                      </Label>
                      <Input
                        id={`zeit-${zeile.key}`}
                        inputMode="text"
                        autoComplete="off"
                        placeholder="vor 2 Stunden"
                        value={zeile.zeit}
                        onChange={(event) => aendere(zeile.key, { zeit: event.target.value })}
                      />
                    </div>
                    {(zeile.type === 'bottle' || zeile.type === 'pumping') && (
                      <div className="w-24">
                        <Label htmlFor={`menge-${zeile.key}`} className="text-xs">
                          ml
                        </Label>
                        <Input
                          id={`menge-${zeile.key}`}
                          inputMode="numeric"
                          value={zeile.menge}
                          onChange={(event) => aendere(zeile.key, { menge: event.target.value })}
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setZeilen((alle) => alle.filter((z) => z.key !== zeile.key))}
                      aria-label="Zeile entfernen"
                      className="flex size-12 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-destructive"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>

                  {zeile.type === 'nursing' && (
                    <VariantenWahl
                      labels={NURSING_SIDE_LABEL}
                      value={zeile.variante}
                      onChange={(wert) => aendere(zeile.key, { variante: wert })}
                    />
                  )}
                  {zeile.type === 'diaper' && (
                    <VariantenWahl
                      labels={DIAPER_KIND_LABEL}
                      value={zeile.variante}
                      onChange={(wert) => aendere(zeile.key, { variante: wert })}
                    />
                  )}

                  <p className="text-xs text-muted-foreground">
                    {zeit
                      ? zeitBestaetigung(zeit, jetzt, tz)
                      : zeile.zeit
                        ? 'Diese Zeitangabe versteht die App noch nicht.'
                        : 'Ohne Zeit wird die Zeile nicht gespeichert.'}
                  </p>
                </div>
              )
            })}

            <Button
              variant="ghost"
              className="h-12"
              onClick={() =>
                setZeilen((alle) => [
                  ...alle,
                  neueZeile(alle[alle.length - 1]?.type ?? 'nursing', vorschlaege),
                ])
              }
            >
              <Plus aria-hidden />
              Zeile hinzufügen
            </Button>

            <Button size="lg" disabled={pending || zeilen.length === 0} onClick={speichern}>
              Speichern
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function VariantenWahl({
  labels,
  value,
  onChange,
}: {
  labels: Record<string, string>
  value: string | null
  onChange: (wert: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(labels).map(([wert, label]) => (
        <button
          key={wert}
          type="button"
          aria-pressed={value === wert}
          onClick={() => onChange(wert)}
          className={cn(
            'min-h-10 rounded-lg border px-3 text-sm',
            value === wert ? 'border-primary bg-primary/10 font-semibold' : 'border-border bg-card',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
