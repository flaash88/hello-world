'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  beideBehaltenAction,
  meinenLoeschenAction,
  mergeDuplikatAction,
} from '@/lib/actions/duplicates'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'

export type VerdachtView = {
  id: string
  eintraege: {
    id: string
    titel: string
    detail: string
    zeit: string
    wer: string
    istMeiner: boolean
  }[]
}

export function DuplikatListe({ verdachte }: { verdachte: VerdachtView[] }) {
  return (
    <ul className="flex flex-col gap-3" data-testid="duplikat-liste">
      {verdachte.map((verdacht) => (
        <li key={verdacht.id}>
          <VerdachtKarte verdacht={verdacht} />
        </li>
      ))}
    </ul>
  )
}

function VerdachtKarte({ verdacht }: { verdacht: VerdachtView }) {
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  // Loeschen bietet die App nur fuer den eigenen Eintrag an – den der anderen
  // Person wegzuraeumen, ohne dass sie es merkt, waere uebergriffig.
  const meiner = verdacht.eintraege.find((eintrag) => eintrag.istMeiner)

  function lauf(fn: () => Promise<{ ok: true } | { error: string }>, titel: string) {
    startTransition(async () => {
      const result = await fn()
      if ('error' in result) {
        toast({ title: 'Nicht geändert', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: titel })
      }
      router.refresh()
    })
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <ul className="flex flex-col gap-2">
          {verdacht.eintraege.map((eintrag) => (
            <li key={eintrag.id} className="rounded-lg border border-border p-3">
              <p className="font-semibold">{eintrag.titel}</p>
              <p className="text-sm text-muted-foreground">
                {eintrag.zeit} · {eintrag.wer}
                {eintrag.istMeiner ? ' (du)' : ''}
              </p>
              {eintrag.detail && <p className="text-sm">{eintrag.detail}</p>}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-2">
          <Button
            size="lg"
            className="flex-1"
            disabled={pending}
            onClick={() => lauf(() => mergeDuplikatAction(verdacht.id), 'Zusammengeführt')}
          >
            Zusammenführen
          </Button>
          <Button
            size="lg"
            variant="outline"
            disabled={pending}
            onClick={() => lauf(() => beideBehaltenAction(verdacht.id), 'Beide bleiben')}
          >
            Beide behalten
          </Button>
          {meiner && (
            <Button
              size="lg"
              variant="ghost"
              disabled={pending}
              onClick={() =>
                lauf(() => meinenLoeschenAction(verdacht.id, meiner.id), 'Eintrag gelöscht')
              }
            >
              Meinen löschen
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
