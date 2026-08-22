'use client'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { registerAction, type ActionState } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? 'Wird angelegt …' : 'Konto anlegen'}
    </Button>
  )
}

export function RegisterForm() {
  const [state, action] = useActionState<ActionState, FormData>(registerAction, {})
  return (
    <Card>
      <CardContent className="pt-5">
        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inviteCode">Einladungscode</Label>
            <Input
              id="inviteCode"
              name="inviteCode"
              required
              autoFocus
              placeholder="ABCD-EFGH"
              className="font-mono uppercase tracking-widest"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="displayName">Dein Name</Label>
            <Input id="displayName" name="displayName" required placeholder="Mama" autoComplete="name" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-Mail</Label>
            <Input id="email" name="email" type="email" required autoComplete="username" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Passwort</Label>
            <Input id="password" name="password" type="password" required autoComplete="new-password" minLength={10} />
            <p className="text-xs text-muted-foreground">Mindestens 10 Zeichen.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="passwordConfirm">Passwort wiederholen</Label>
            <Input id="passwordConfirm" name="passwordConfirm" type="password" required autoComplete="new-password" />
          </div>
          {state.error && (
            <p role="alert" data-testid="form-error" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {state.error}
            </p>
          )}
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  )
}
