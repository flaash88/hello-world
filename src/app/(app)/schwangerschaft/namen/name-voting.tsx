'use client'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Heart, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import {
  addNameSuggestionAction,
  deleteNameSuggestionAction,
  undoNameVoteAction,
  voteNameAction,
} from '@/lib/actions/pregnancy-tracking'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'

type Member = { id: string; displayName: string; initials: string; color: string }
type Suggestion = {
  id: string
  name: string
  sex: string
  note: string | null
  createdById: string
  votes: { userId: string; vote: number }[]
}

const SEX_LABEL: Record<string, string> = {
  female: 'Mädchen',
  male: 'Bub',
  unknown: 'Egal',
}

/**
 * Voting in zwei Schritten: Erst geht jede Person die Namen durch, die sie noch
 * nicht bewertet hat (eine Karte nach der anderen, ja oder nein). Ein Match
 * entsteht, wenn beide Ja gesagt haben – aber erst dann sieht man auch, wie die
 * andere Person abgestimmt hat.
 */
export function NameVoting({
  suggestions,
  currentUserId,
  memberCount,
  members,
}: {
  suggestions: Suggestion[]
  currentUserId: string
  memberCount: number
  members: Member[]
}) {
  const [adding, setAdding] = useState(false)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members])

  const { pendingVote, matches, rejected } = useMemo(() => {
    const myVote = (s: Suggestion) => s.votes.find((v) => v.userId === currentUserId)?.vote ?? null
    return {
      pendingVote: suggestions.filter((s) => myVote(s) === null),
      matches: suggestions.filter(
        (s) => s.votes.length >= memberCount && s.votes.every((v) => v.vote === 1),
      ),
      rejected: suggestions.filter(
        (s) => myVote(s) !== null && s.votes.some((v) => v.vote === -1),
      ),
    }
  }, [suggestions, currentUserId, memberCount])

  const current = pendingVote[0] ?? null

  function vote(suggestionId: string, value: 1 | -1) {
    startTransition(async () => {
      const result = await voteNameAction(suggestionId, value)
      if ('error' in result) {
        toast({ title: 'Nicht gespeichert', description: result.error, variant: 'destructive' })
      } else {
        toast({
          title: value === 1 ? 'Gefällt dir' : 'Abgelehnt',
          action: {
            label: 'Rückgängig',
            onClick: async () => {
              await undoNameVoteAction(suggestionId)
              router.refresh()
            },
          },
        })
      }
      router.refresh()
    })
  }

  function remove(id: string, name: string) {
    startTransition(async () => {
      const result = await deleteNameSuggestionAction(id)
      if ('error' in result) {
        toast({ title: 'Nicht gelöscht', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: `„${name}“ entfernt` })
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <Button size="lg" onClick={() => setAdding(true)}>
        <Plus aria-hidden />
        Namen vorschlagen
      </Button>

      <Tabs defaultValue="vote">
        <TabsList className="w-full">
          <TabsTrigger value="vote">
            Abstimmen{pendingVote.length > 0 && ` (${pendingVote.length})`}
          </TabsTrigger>
          <TabsTrigger value="matches">Treffer ({matches.length})</TabsTrigger>
          <TabsTrigger value="all">Alle ({suggestions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="vote">
          {current ? (
            <div className="flex flex-col gap-4">
              <Card className="min-h-56">
                <CardContent className="flex min-h-56 flex-col items-center justify-center gap-3 py-8 text-center">
                  <p className="font-display text-4xl font-bold">{current.name}</p>
                  <Badge variant="secondary">{SEX_LABEL[current.sex] ?? 'Egal'}</Badge>
                  {current.note && <p className="text-sm text-muted-foreground">{current.note}</p>}
                  <p className="text-xs text-muted-foreground">
                    Vorgeschlagen von {memberById.get(current.createdById)?.displayName ?? 'jemandem'}
                  </p>
                </CardContent>
              </Card>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  size="xl"
                  variant="outline"
                  onClick={() => vote(current.id, -1)}
                  disabled={pending}
                  className="h-24 flex-col"
                >
                  <X className="size-7" aria-hidden />
                  Nein
                </Button>
                <Button
                  size="xl"
                  onClick={() => vote(current.id, 1)}
                  disabled={pending}
                  className="h-24 flex-col"
                >
                  <Heart className="size-7" aria-hidden />
                  Ja
                </Button>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Noch {pendingVote.length} {pendingVote.length === 1 ? 'Name' : 'Namen'} zu bewerten
              </p>
            </div>
          ) : (
            <EmptyState
              icon={Check}
              title="Alles bewertet"
              description={
                suggestions.length === 0
                  ? 'Tragt eure Favoriten ein – jede Person bewertet die Vorschläge der anderen, ohne zu sehen, wie abgestimmt wurde.'
                  : 'Sobald jemand einen neuen Namen einträgt, taucht er hier auf.'
              }
            />
          )}
        </TabsContent>

        <TabsContent value="matches">
          {matches.length === 0 ? (
            <EmptyState
              icon={Heart}
              title="Noch kein Treffer"
              description="Ein Treffer entsteht, wenn ihr beide Ja gesagt habt."
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {matches.map((suggestion) => (
                <li key={suggestion.id}>
                  <Card className="border-primary">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2">
                        <Heart className="size-5 fill-primary text-primary" aria-hidden />
                        {suggestion.name}
                      </CardTitle>
                      <CardDescription>
                        {SEX_LABEL[suggestion.sex] ?? 'Egal'}
                        {suggestion.note && ` · ${suggestion.note}`}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="all">
          {suggestions.length === 0 ? (
            <EmptyState icon={Plus} title="Noch keine Namen" description="Fangt einfach an." />
          ) : (
            <ul className="flex flex-col gap-2">
              {suggestions.map((suggestion) => {
                const myVote = suggestion.votes.find((v) => v.userId === currentUserId)?.vote ?? null
                const isMatch = matches.some((m) => m.id === suggestion.id)
                const isRejected = rejected.some((r) => r.id === suggestion.id)
                return (
                  <li key={suggestion.id}>
                    <Card>
                      <CardContent className="flex items-center gap-3 p-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-display text-lg font-semibold">{suggestion.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline">{SEX_LABEL[suggestion.sex] ?? 'Egal'}</Badge>
                            {isMatch && <Badge>Treffer</Badge>}
                            {isRejected && <Badge variant="muted">Abgelehnt</Badge>}
                            {myVote === null && <Badge variant="secondary">Noch offen</Badge>}
                          </div>
                          {suggestion.note && (
                            <p className="mt-1 text-sm text-muted-foreground">{suggestion.note}</p>
                          )}
                        </div>
                        {memberById.get(suggestion.createdById) && (
                          <UserAvatar
                            size="sm"
                            initials={memberById.get(suggestion.createdById)!.initials}
                            color={memberById.get(suggestion.createdById)!.color}
                            title={`Vorgeschlagen von ${memberById.get(suggestion.createdById)!.displayName}`}
                          />
                        )}
                        {myVote !== null && (
                          <button
                            type="button"
                            onClick={() =>
                              startTransition(async () => {
                                await undoNameVoteAction(suggestion.id)
                                router.refresh()
                              })
                            }
                            disabled={pending}
                            aria-label={`Bewertung von ${suggestion.name} zurücknehmen`}
                            className="flex size-12 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
                          >
                            <RotateCcw className="size-4" aria-hidden />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => remove(suggestion.id, suggestion.name)}
                          disabled={pending}
                          aria-label={`${suggestion.name} löschen`}
                          className="flex size-12 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-destructive"
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      </CardContent>
                    </Card>
                  </li>
                )
              })}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <AddNameDialog open={adding} onOpenChange={setAdding} />
    </div>
  )
}

function AddNameDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  function submit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await addNameSuggestionAction({
        name: String(formData.get('name') ?? ''),
        sex: (formData.get('sex') as 'male' | 'female' | 'unknown') ?? 'unknown',
        note: String(formData.get('note') ?? ''),
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      toast({ title: 'Auf der Liste' })
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Namen vorschlagen</DialogTitle>
        </DialogHeader>
        <form action={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required maxLength={60} autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sex">Für</Label>
            <Select name="sex" defaultValue="unknown">
              <SelectTrigger id="sex">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="female">Mädchen</SelectItem>
                <SelectItem value="male">Bub</SelectItem>
                <SelectItem value="unknown">Egal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note">Notiz</Label>
            <Input id="note" name="note" maxLength={200} placeholder="z. B. nach der Uroma" />
          </div>
          <p className="text-xs text-muted-foreground">
            Dein Vorschlag zählt automatisch als Ja. Die andere Person sieht erst nach ihrer eigenen
            Bewertung, wie du abgestimmt hast.
          </p>
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? 'Speichert …' : 'Hinzufügen'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
