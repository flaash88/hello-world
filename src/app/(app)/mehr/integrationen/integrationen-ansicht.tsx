'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, KeyRound, Plus, Trash2, Webhook as WebhookIcon } from 'lucide-react'
import {
  createTokenAction,
  deleteWebhookAction,
  revokeTokenAction,
  saveWebhookAction,
} from '@/lib/actions/integrations'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

export type TokenView = {
  id: string
  name: string
  gehoert: string
  angelegt: string
  zuletzt: string | null
  widerrufen: boolean
}

export type WebhookView = {
  id: string
  url: string
  eventTypes: string[]
  active: boolean
  lastError: string | null
  failures: number
  zuletzt: string | null
}

export type ZugriffView = { id: string; wann: string; text: string; detail: string | null }

export function IntegrationenAnsicht({
  types,
  tokens,
  webhooks,
  zugriffe,
}: {
  types: string[]
  tokens: TokenView[]
  webhooks: WebhookView[]
  zugriffe: ZugriffView[]
}) {
  const [neuerToken, setNeuerToken] = useState<string | null>(null)
  const [webhookOffen, setWebhookOffen] = useState<WebhookView | 'neu' | null>(null)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Für Home Assistant und NFC-Tags. Ein Token gehört zu einem Haushalt und zu der Person, die
        ihn anlegt – Einträge darüber erscheinen mit ihrem Namen und der Quelle „Automation“. Die
        Anleitung samt fertiger Snippets liegt im Repository unter{' '}
        <code>docs/homeassistant.md</code>.
      </p>

      <TokenBereich tokens={tokens} onNeu={setNeuerToken} />

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Webhooks
        </h2>
        <ul className="flex flex-col gap-2">
          {webhooks.map((webhook) => (
            <li key={webhook.id}>
              <Card>
                <CardContent className="flex flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{webhook.url}</p>
                      <p className="text-sm text-muted-foreground">
                        {webhook.eventTypes.length === 0
                          ? 'Alle Ereignisse'
                          : webhook.eventTypes.join(', ')}
                        {webhook.zuletzt ? ` · zuletzt ${webhook.zuletzt}` : ''}
                      </p>
                    </div>
                    {!webhook.active && <Badge variant="outline">Aus</Badge>}
                  </div>
                  {webhook.lastError && (
                    <p className="text-sm">
                      Letzter Fehler: {webhook.lastError}
                      {webhook.failures > 1 ? ` (${webhook.failures}×)` : ''}
                    </p>
                  )}
                  <Button variant="outline" onClick={() => setWebhookOffen(webhook)}>
                    Ändern
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
        <Button
          variant="outline"
          size="lg"
          className="mt-2 w-full"
          onClick={() => setWebhookOffen('neu')}
        >
          <WebhookIcon aria-hidden />
          Webhook hinzufügen
        </Button>
      </section>

      {zugriffe.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Letzte Zugriffe
          </h2>
          <ul className="overflow-hidden rounded-xl border border-border bg-card text-sm">
            {zugriffe.map((zugriff) => (
              <li key={zugriff.id} className="border-b border-border p-3 last:border-b-0">
                <p className="tabular">{zugriff.text}</p>
                <p className="text-muted-foreground">
                  {zugriff.wann}
                  {zugriff.detail ? ` · ${zugriff.detail}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <TokenDialog token={neuerToken} onClose={() => setNeuerToken(null)} />
      <WebhookDialog
        types={types}
        webhook={webhookOffen}
        onClose={() => setWebhookOffen(null)}
      />
    </div>
  )
}

function TokenBereich({
  tokens,
  onNeu,
}: {
  tokens: TokenView[]
  onNeu: (token: string) => void
}) {
  const [name, setName] = useState('')
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  function anlegen() {
    startTransition(async () => {
      const result = await createTokenAction(name)
      if ('error' in result) {
        toast({ title: 'Nicht angelegt', description: result.error, variant: 'destructive' })
        return
      }
      setName('')
      if (result.token) onNeu(result.token)
      router.refresh()
    })
  }

  function widerrufen(id: string) {
    startTransition(async () => {
      const result = await revokeTokenAction(id)
      if ('error' in result) {
        toast({ title: 'Nicht widerrufen', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Token widerrufen' })
      }
      router.refresh()
    })
  }

  return (
    <section>
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        Tokens
      </h2>

      <ul className="flex flex-col gap-2">
        {tokens.map((token) => (
          <li key={token.id}>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <KeyRound className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className={cn('font-semibold', token.widerrufen && 'line-through')}>
                    {token.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {token.gehoert} · angelegt {token.angelegt}
                    {token.zuletzt ? ` · zuletzt ${token.zuletzt}` : ' · noch nie benutzt'}
                  </p>
                </div>
                {token.widerrufen ? (
                  <Badge variant="outline">Widerrufen</Badge>
                ) : (
                  <Button
                    variant="ghost"
                    disabled={pending}
                    onClick={() => widerrufen(token.id)}
                    aria-label={`${token.name} widerrufen`}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex gap-2">
        <Input
          value={name}
          maxLength={60}
          placeholder="z. B. Home Assistant"
          aria-label="Name des Tokens"
          onChange={(event) => setName(event.target.value)}
        />
        <Button size="lg" disabled={pending || name.trim().length === 0} onClick={anlegen}>
          <Plus aria-hidden />
          Anlegen
        </Button>
      </div>
    </section>
  )
}

/** Der Token steht genau einmal da – danach ist nur noch der Hash gespeichert. */
function TokenDialog({ token, onClose }: { token: string | null; onClose: () => void }) {
  const { toast } = useToast()

  return (
    <Dialog open={token !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Token angelegt</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Kopier ihn jetzt. Er steht nur dieses eine Mal da – gespeichert ist nur sein Hash.
        </p>
        <p className="break-all rounded-lg border-2 border-border bg-muted/40 p-3 font-mono text-sm">
          {token}
        </p>
        <Button
          size="lg"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(token ?? '')
              toast({ title: 'Token kopiert' })
            } catch {
              toast({ title: 'Kopieren ging nicht', description: 'Bitte von Hand markieren.' })
            }
          }}
        >
          <Copy aria-hidden />
          Kopieren
        </Button>
        <Button variant="outline" onClick={onClose}>
          Fertig
        </Button>
      </DialogContent>
    </Dialog>
  )
}

function WebhookDialog({
  types,
  webhook,
  onClose,
}: {
  types: string[]
  webhook: WebhookView | 'neu' | null
  onClose: () => void
}) {
  const vorhanden = webhook !== null && webhook !== 'neu' ? webhook : null
  const [url, setUrl] = useState('')
  const [gewaehlt, setGewaehlt] = useState<string[]>([])
  const [aktiv, setAktiv] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [geladen, setGeladen] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  const schluessel = vorhanden?.id ?? 'neu'
  if (webhook !== null && geladen !== schluessel) {
    setGeladen(schluessel)
    setUrl(vorhanden?.url ?? '')
    setGewaehlt(vorhanden?.eventTypes ?? [])
    setAktiv(vorhanden?.active ?? true)
    setError(null)
  }
  if (webhook === null && geladen !== null) setGeladen(null)

  function speichern() {
    setError(null)
    startTransition(async () => {
      const result = await saveWebhookAction({
        id: vorhanden?.id,
        url,
        eventTypes: gewaehlt,
        active: aktiv,
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      toast({ title: 'Gespeichert' })
      onClose()
      router.refresh()
    })
  }

  function loeschen() {
    if (!vorhanden) return
    startTransition(async () => {
      const result = await deleteWebhookAction(vorhanden.id)
      if ('error' in result) {
        setError(result.error)
        return
      }
      toast({ title: 'Webhook entfernt' })
      onClose()
      router.refresh()
    })
  }

  return (
    <Dialog open={webhook !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{vorhanden ? 'Webhook ändern' : 'Webhook hinzufügen'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="webhookUrl">Adresse</Label>
            <Input
              id="webhookUrl"
              type="url"
              value={url}
              maxLength={300}
              placeholder="http://homeassistant.local:8123/api/webhook/sproessling"
              onChange={(event) => setUrl(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Ereignisse</Label>
            <p className="text-xs text-muted-foreground">
              Nichts gewählt heißt: alle.
            </p>
            <div className="flex max-h-52 flex-wrap gap-2 overflow-y-auto">
              {types.map((type) => {
                const an = gewaehlt.includes(type)
                return (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={an}
                    onClick={() =>
                      setGewaehlt(an ? gewaehlt.filter((t) => t !== type) : [...gewaehlt, type])
                    }
                    className={cn(
                      'min-h-10 rounded-full border-2 px-3 text-sm font-semibold',
                      an ? 'border-primary bg-primary/10' : 'border-border',
                    )}
                  >
                    {type}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="webhookAktiv">Aktiv</Label>
            <Switch id="webhookAktiv" checked={aktiv} onCheckedChange={setAktiv} />
          </div>

          {error && (
            <p role="alert" data-testid="form-error" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}

          <Button size="lg" onClick={speichern} disabled={pending}>
            {pending ? 'Speichert …' : 'Speichern'}
          </Button>
          {vorhanden && (
            <Button variant="ghost" onClick={loeschen} disabled={pending}>
              <Trash2 aria-hidden />
              Webhook entfernen
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
