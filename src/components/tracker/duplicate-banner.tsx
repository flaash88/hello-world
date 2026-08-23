'use client'
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Users } from 'lucide-react'
import {
  beideBehaltenAction,
  meinenLoeschenAction,
  mergeDuplikatAction,
} from '@/lib/actions/duplicates'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

export type DuplikatHinweisPayload = {
  id: string
  text: string
  deutlich: boolean
  meinEventId: string
  anderesEventId: string
}

const EREIGNIS = 'sp:duplikat'

/** Von ueberall aufrufbar, wo ein Eintrag entstanden ist. */
export function meldeDuplikat(hinweis: DuplikatHinweisPayload): void {
  window.dispatchEvent(new CustomEvent<DuplikatHinweisPayload>(EREIGNIS, { detail: hinweis }))
}

/**
 * Nicht-modaler Hinweis auf eine mutmassliche Doppelerfassung.
 *
 * Bewusst kein Dialog: der Eintrag ist gespeichert, es eilt nichts, und nachts
 * um drei will niemand erst eine Frage beantworten, bevor er das Handy weglegen
 * darf. Wer den Hinweis ignoriert, verliert nichts – der Verdacht bleibt offen
 * und taucht in der Auswertung wieder auf.
 */
export function DuplicateBanner() {
  const [hinweis, setHinweis] = useState<DuplikatHinweisPayload | null>(null)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const handler = (event: Event) => {
      setHinweis((event as CustomEvent<DuplikatHinweisPayload>).detail)
    }
    window.addEventListener(EREIGNIS, handler)
    return () => window.removeEventListener(EREIGNIS, handler)
  }, [])

  if (!hinweis) return null

  function lauf(fn: () => Promise<{ ok: true } | { error: string }>, titel: string) {
    startTransition(async () => {
      const result = await fn()
      if ('error' in result) {
        toast({ title: 'Nicht geändert', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: titel })
        setHinweis(null)
      }
      router.refresh()
    })
  }

  return (
    <div
      role="status"
      data-testid="duplikat-hinweis"
      className={cn(
        'fixed inset-x-2 bottom-20 z-40 rounded-xl border-2 bg-card p-3 shadow-lg print:hidden',
        hinweis.deutlich ? 'border-primary' : 'border-border',
      )}
    >
      <p className="flex items-start gap-2 font-semibold">
        <Users className="mt-0.5 size-4 shrink-0" aria-hidden />
        {hinweis.text}
      </p>
      {hinweis.deutlich && (
        <p className="mt-1 text-sm text-muted-foreground">
          Bei Medikamenten zählt das: sonst denkt ihr beide, die Dosis sei zweimal gegeben worden.
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="lg"
          className="flex-1"
          disabled={pending}
          onClick={() => lauf(() => mergeDuplikatAction(hinweis.id), 'Zusammengeführt')}
        >
          Zusammenführen
        </Button>
        <Button
          size="lg"
          variant="outline"
          disabled={pending}
          onClick={() => lauf(() => beideBehaltenAction(hinweis.id), 'Beide bleiben')}
        >
          Beide behalten
        </Button>
        <Button
          size="lg"
          variant="ghost"
          disabled={pending}
          onClick={() =>
            lauf(
              () => meinenLoeschenAction(hinweis.id, hinweis.meinEventId),
              'Eintrag gelöscht',
            )
          }
        >
          Meinen löschen
        </Button>
      </div>
    </div>
  )
}
