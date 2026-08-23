'use client'
import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteHouseholdAction } from '@/lib/actions/settings'
import { DELETE_CONFIRMATION } from '@/lib/settings/deletion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function DangerZone({
  householdName,
  memberCount,
}: {
  householdName: string
  memberCount: number
}) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit() {
    setError(null)
    startTransition(async () => {
      // Bei Erfolg leitet die Action selbst weiter – hier kommt nur ein
      // Fehler zurueck.
      const result = await deleteHouseholdAction({ password, confirmation })
      if (result && 'error' in result) setError(result.error)
    })
  }

  return (
    <>
      <Button variant="destructive" className="w-full" onClick={() => setOpen(true)}>
        <Trash2 aria-hidden />
        Haushalt und alle Daten löschen
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wirklich alles löschen?</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              „{householdName}“ verschwindet mit allen Einträgen, Fotos und{' '}
              {memberCount === 1 ? 'deinem Konto' : `beiden Konten (${memberCount} Personen)`}.
              Auch das private Elterntagebuch ist danach weg. Lade dir vorher den Export
              herunter, wenn du etwas behalten willst.
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deletePassword">Dein Passwort</Label>
              <Input
                id="deletePassword"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deleteConfirm">Tippe {DELETE_CONFIRMATION}</Label>
              <Input
                id="deleteConfirm"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </div>
            {error && (
              <p data-testid="form-error" className="text-sm font-medium text-destructive">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                Abbrechen
              </Button>
              <Button variant="destructive" className="flex-1" onClick={submit} disabled={pending}>
                {pending ? 'Löscht …' : 'Endgültig löschen'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
