'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Heart, Pause, Play, Volume2 } from 'lucide-react'
import { SOUNDS, type SoundId } from '@/lib/sounds/generators'
import { SoundPlayer, updateMediaSession } from '@/lib/sounds/player'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { formatStopwatch } from '@/lib/time'
import { cn } from '@/lib/utils'

const TIMER_OPTIONS = [
  { label: 'Ohne Timer', seconds: null },
  { label: '15 Min', seconds: 15 * 60 },
  { label: '30 Min', seconds: 30 * 60 },
  { label: '45 Min', seconds: 45 * 60 },
  { label: '60 Min', seconds: 60 * 60 },
]

const FAVORITES_KEY = 'sp.sound-favorites'
const VOLUME_KEY = 'sp.sound-volume'

export function SoundBoard() {
  const playerRef = useRef<SoundPlayer | null>(null)
  const [playing, setPlaying] = useState<SoundId | null>(null)
  const [volume, setVolume] = useState(0.6)
  const [timerSec, setTimerSec] = useState<number | null>(30 * 60)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [favorites, setFavorites] = useState<SoundId[]>([])

  useEffect(() => {
    const storedVolume = Number(window.localStorage.getItem(VOLUME_KEY))
    if (Number.isFinite(storedVolume) && storedVolume > 0) setVolume(storedVolume)

    try {
      const stored = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) ?? '[]')
      if (Array.isArray(stored)) setFavorites(stored as SoundId[])
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
    async (id: SoundId) => {
      playerRef.current ??= new SoundPlayer()
      const player = playerRef.current

      if (playing === id) {
        stop()
        return
      }

      player.setVolume(volume)
      await player.play(id, { fadeOutAfterSec: timerSec })
      setPlaying(id)
      setRemaining(timerSec)
      updateMediaSession(id, stop)
    },
    [playing, stop, timerSec, volume],
  )

  function toggleFavorite(id: SoundId) {
    setFavorites((current) => {
      const next = current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
      return next
    })
  }

  const ordered = useMemo(
    () => [...SOUNDS].sort((a, b) => {
      const aFav = favorites.includes(a.id) ? 0 : 1
      const bFav = favorites.includes(b.id) ? 0 : 1
      return aFav - bFav
    }),
    [favorites],
  )

  return (
    <div className="flex flex-col gap-4">
      {playing && (
        <Card className="border-primary">
          <CardContent className="flex items-center gap-4 p-4">
            <span aria-hidden className="size-3 animate-breathe rounded-full bg-primary" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{SOUNDS.find((s) => s.id === playing)?.label}</p>
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
          const isPlaying = playing === sound.id
          const isFavorite = favorites.includes(sound.id)
          return (
            <li key={sound.id}>
              <Card className={cn(isPlaying && 'border-primary')}>
                <CardContent className="flex items-center gap-3 p-3">
                  <Button
                    size="icon"
                    variant={isPlaying ? 'default' : 'outline'}
                    onClick={() => void toggle(sound.id)}
                    aria-label={isPlaying ? `${sound.label} beenden` : `${sound.label} abspielen`}
                  >
                    {isPlaying ? <Pause /> : <Play />}
                  </Button>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{sound.label}</p>
                    <p className="text-sm text-muted-foreground">{sound.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(sound.id)}
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
    </div>
  )
}
