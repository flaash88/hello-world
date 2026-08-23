'use client'
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Pause, Play, Trash2, Upload, Volume2 } from 'lucide-react'
import { SOUNDS, type SoundId } from '@/lib/sounds/generators'
import { SoundPlayer, updateMediaSession } from '@/lib/sounds/player'
import {
  deleteCustomSoundAction,
  uploadCustomSoundAction,
  type CustomSoundDto,
} from '@/lib/actions/sounds'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { formatStopwatch } from '@/lib/time'
import { cn } from '@/lib/utils'

/** Erzeugter Klang oder eigene Datei – die Leiste behandelt beide gleich. */
type BoardSound = {
  key: string
  label: string
  description: string
  /** Nur bei eigenen Dateien gesetzt. */
  custom?: { id: string; url: string }
}

const TIMER_OPTIONS = [
  { label: 'Ohne Timer', seconds: null },
  { label: '15 Min', seconds: 15 * 60 },
  { label: '30 Min', seconds: 30 * 60 },
  { label: '45 Min', seconds: 45 * 60 },
  { label: '60 Min', seconds: 60 * 60 },
]

const FAVORITES_KEY = 'sp.sound-favorites'
const VOLUME_KEY = 'sp.sound-volume'

export function SoundBoard({ customSounds }: { customSounds: CustomSoundDto[] }) {
  const playerRef = useRef<SoundPlayer | null>(null)
  const [playing, setPlaying] = useState<string | null>(null)
  const [volume, setVolume] = useState(0.6)
  const [timerSec, setTimerSec] = useState<number | null>(30 * 60)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [favorites, setFavorites] = useState<string[]>([])

  useEffect(() => {
    const storedVolume = Number(window.localStorage.getItem(VOLUME_KEY))
    if (Number.isFinite(storedVolume) && storedVolume > 0) setVolume(storedVolume)

    try {
      const stored = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) ?? '[]')
      if (Array.isArray(stored)) setFavorites(stored as string[])
    } catch {
      // Kaputte Einstellung ignorieren.
    }
  }, [])

  // Der Player lebt außerhalb von React – beim Verlassen der Seite abbauen.
  useEffect(() => {
    return () => {
      void playerRef.current?.dispose()
      playerRef.current = null
      updateMediaSession(null, () => undefined)
    }
  }, [])

  // Restlaufzeit des Timers herunterzählen.
  useEffect(() => {
    if (remaining === null) return
    if (remaining <= 0) {
      setRemaining(null)
      setPlaying(null)
      return
    }
    const id = window.setTimeout(() => setRemaining((value) => (value === null ? null : value - 1)), 1000)
    return () => window.clearTimeout(id)
  }, [remaining])

  const stop = useCallback(() => {
    playerRef.current?.stop()
    setPlaying(null)
    setRemaining(null)
    updateMediaSession(null, () => undefined)
  }, [])

  const toggle = useCallback(
    async (sound: BoardSound) => {
      playerRef.current ??= new SoundPlayer()
      const player = playerRef.current

      if (playing === sound.key) {
        stop()
        return
      }

      player.setVolume(volume)
      if (sound.custom) {
        await player.playUrl(sound.key, sound.custom.url, { fadeOutAfterSec: timerSec })
      } else {
        await player.play(sound.key as SoundId, { fadeOutAfterSec: timerSec })
      }
      setPlaying(sound.key)
      setRemaining(timerSec)
      updateMediaSession(sound.key, stop, sound.label)
    },
    [playing, stop, timerSec, volume],
  )

  function toggleFavorite(id: string) {
    setFavorites((current) => {
      const next = current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
      return next
    })
  }

  const ordered = useMemo(() => {
    const generated: BoardSound[] = SOUNDS.map((sound) => ({
      key: sound.id,
      label: sound.label,
      description: sound.description,
    }))
    const own: BoardSound[] = customSounds.map((sound) => ({
      key: `custom:${sound.id}`,
      label: sound.name,
      description: `Eigene Datei · ${Math.max(1, Math.round(sound.bytes / 1024))} KB · von ${sound.createdBy}`,
      custom: { id: sound.id, url: sound.url },
    }))
    return [...own, ...generated].sort((a, b) => {
      const aFav = favorites.includes(a.key) ? 0 : 1
      const bFav = favorites.includes(b.key) ? 0 : 1
      return aFav - bFav
    })
  }, [customSounds, favorites])

  const current = ordered.find((sound) => sound.key === playing) ?? null

  return (
    <div className="flex flex-col gap-4">
      {playing && (
        <Card className="border-primary">
          <CardContent className="flex items-center gap-4 p-4">
            <span aria-hidden className="size-3 animate-breathe rounded-full bg-primary" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{current?.label}</p>
              <p className="tabular text-sm text-muted-foreground">
                {remaining === null ? 'läuft ohne Timer' : `noch ${formatStopwatch(remaining)}`}
              </p>
            </div>
            <Button size="icon" variant="outline" onClick={stop} aria-label="Wiedergabe beenden">
              <Pause />
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="volume" className="flex items-center gap-1.5">
          <Volume2 className="size-4" aria-hidden />
          Lautstärke: {Math.round(volume * 100)} %
        </Label>
        <Slider
          id="volume"
          min={0}
          max={100}
          step={5}
          value={[Math.round(volume * 100)]}
          onValueChange={([value]) => {
            const next = (value ?? 60) / 100
            setVolume(next)
            playerRef.current?.setVolume(next)
            window.localStorage.setItem(VOLUME_KEY, String(next))
          }}
          aria-label="Lautstärke"
        />
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold text-muted-foreground">
          Timer mit sanftem Ausblenden
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {TIMER_OPTIONS.map((option) => (
            <button
              key={option.label}
              type="button"
              aria-pressed={timerSec === option.seconds}
              onClick={() => setTimerSec(option.seconds)}
              className={cn(
                'min-h-12 rounded-xl border-2 text-sm font-semibold',
                timerSec === option.seconds ? 'border-primary bg-primary/10 text-primary' : 'border-border',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <ul className="flex flex-col gap-2">
        {ordered.map((sound) => {
          const isPlaying = playing === sound.key
          const isFavorite = favorites.includes(sound.key)
          return (
            <li key={sound.key}>
              <Card className={cn(isPlaying && 'border-primary')}>
                <CardContent className="flex items-center gap-3 p-3">
                  <Button
                    size="icon"
                    variant={isPlaying ? 'default' : 'outline'}
                    onClick={() => void toggle(sound)}
                    aria-label={isPlaying ? `${sound.label} beenden` : `${sound.label} abspielen`}
                  >
                    {isPlaying ? <Pause /> : <Play />}
                  </Button>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{sound.label}</p>
                    <p className="text-sm text-muted-foreground">{sound.description}</p>
                  </div>
                  {sound.custom && <DeleteSoundButton id={sound.custom.id} label={sound.label} onDeleted={stop} />}
                  <button
                    type="button"
                    onClick={() => toggleFavorite(sound.key)}
                    aria-label={isFavorite ? `${sound.label} aus Favoriten entfernen` : `${sound.label} zu Favoriten`}
                    aria-pressed={isFavorite}
                    className="flex size-12 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
                  >
                    <Heart className={cn('size-5', isFavorite && 'fill-primary text-primary')} aria-hidden />
                  </button>
                </CardContent>
              </Card>
            </li>
          )
        })}
      </ul>

      <UploadCard />
    </div>
  )
}

function DeleteSoundButton({
  id,
  label,
  onDeleted,
}: {
  id: string
  label: string
  onDeleted: () => void
}) {
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`${label} löschen`}
      onClick={() =>
        startTransition(async () => {
          onDeleted()
          const result = await deleteCustomSoundAction(id)
          if ('error' in result) {
            toast({ title: 'Nicht gelöscht', description: result.error, variant: 'destructive' })
            return
          }
          router.refresh()
        })
      }
      className="flex size-12 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-destructive"
    >
      <Trash2 className="size-5" aria-hidden />
    </button>
  )
}

function UploadCard() {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  function submit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await uploadCustomSoundAction(formData)
      if ('error' in result) {
        setError(result.error)
        return
      }
      toast({ title: 'Klang hinzugefügt' })
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Upload className="size-4 text-muted-foreground" aria-hidden />
          Eigene Datei hinzufügen
        </CardTitle>
        <CardDescription>
          MP3, OGG, WAV, M4A oder FLAC bis 25 MB. Die Datei liegt auf eurem Server hinter der
          Anmeldung und läuft in Schleife – Timer, Lautstärke und Ausblenden gelten genauso.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={submit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="soundName">Name (optional)</Label>
            <Input id="soundName" name="name" maxLength={60} placeholder="z. B. Regen am Fenster" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="soundFile">Audiodatei</Label>
            <Input id="soundFile" name="file" type="file" accept="audio/*" required />
          </div>
          {error && (
            <p data-testid="form-error" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? 'Lädt hoch …' : 'Hinzufügen'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
