'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Snowflake, Trash2 } from 'lucide-react'
import { auftauenAction, verbrauchePortionAction, verwerfePortionAction } from '@/lib/actions/milk'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'

const STATUS_TEXT: Record<string, string> = {
  vorraetig: 'im Vorrat',
  verbraucht: 'verbraucht',
  verworfen: 'verworfen',
}

export function PortionDetail(props: {
  id: string
  mengeMl: number
  lagerortLabel: string
  behaelter: string | null
  notiz: string | null
  abgepumptText: string
  ablaufText: string
  abgelaufen: boolean
  aufgetaut: boolean
  status: string
  gefroren: boolean
}) {
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  function lauf(fn: () => Promise<{ ok: true; id?: string } | { error: string }>, titel: string) {
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

  const offen = props.status === 'vorraetig'

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="font-display text-2xl font-bold">{props.mengeMl} ml</h1>
            <p className="text-muted-foreground">
              {props.lagerortLabel}
              {props.behaelter ? ` · ${props.behaelter}` : ''}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge variant="outline">{STATUS_TEXT[props.status] ?? props.status}</Badge>
            {props.aufgetaut && <Badge variant="outline">Aufgetaut</Badge>}
          </div>
        </div>

        <p className="text-sm">
          Abgepumpt am {props.abgepumptText} · {props.ablaufText}
        </p>
        {props.notiz && <p className="text-sm">{props.notiz}</p>}

        {offen && (
          <div className="flex flex-col gap-2">
            {!props.abgelaufen && (
              <Button
                size="lg"
                disabled={pending}
                onClick={() => lauf(() => verbrauchePortionAction(props.id), 'Verbraucht')}
              >
                Verbraucht
              </Button>
            )}
            {!props.abgelaufen && props.gefroren && (
              <Button
                size="lg"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  lauf(() => auftauenAction(props.id), 'Aufgetaut – ab jetzt kürzer haltbar')
                }
              >
                <Snowflake aria-hidden />
                Auftauen
              </Button>
            )}
            <Button
              size="lg"
              variant="ghost"
              disabled={pending}
              onClick={() => lauf(() => verwerfePortionAction(props.id), 'Verworfen')}
            >
              <Trash2 aria-hidden />
              Verwerfen
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
