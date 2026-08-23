'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check } from 'lucide-react'
import { createInviteAction } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { formatDateTime } from '@/lib/time'

export function InviteManager({
  openInvites,
}: {
  openInvites: { id: string; label: string | null; createdAt: string; expiresAt: string }[]
}) {
  const [code, setCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  function create(formData: FormData) {
    startTransition(async () => {
      const label = String(formData.get('label') ?? '').trim()
      const result = await createInviteAction(label || undefined)
      setCode(result.code)
      setCopied(false)
      router.refresh()
    })
  }

  async function copy() {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      toast({ title: 'Code kopiert' })
    } catch {
      toast({ title: 'Kopieren hat nicht geklappt', description: 'Bitte den Code abtippen.', variant: 'destructive' })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {code && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-base">Neuer Einladungscode</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="select-all text-center font-mono text-3xl font-bold tracking-widest">{code}</p>
            <Button variant="outline" onClick={copy}>
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
              {copied ? 'Kopiert' : 'Code kopieren'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Der Code wird nur hier einmal im Klartext angezeigt – danach liegt er ausschließlich
              gehasht in der Datenbank.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-5">
          <form action={create} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="label">Notiz (optional)</Label>
              <Input id="label" name="label" placeholder="z. B. für Papa" maxLength={60} />
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? 'Erstellt …' : 'Code erstellen'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {openInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Offene Codes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {openInvites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between gap-2">
                <span>{invite.label ?? 'Ohne Notiz'}</span>
                <span className="text-muted-foreground">
                  gültig bis {formatDateTime(new Date(invite.expiresAt))}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
