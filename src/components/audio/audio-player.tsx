'use client'
import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { dauerText } from '@/lib/audio/notes'
import { Waveform } from './waveform'

const POSITION_PREFIX = 'sp_ton_pos_'

/**
 * Abspieler mit Wellenform.
 *
 * Zwei Kleinigkeiten, die im Alltag den Unterschied machen: die Stelle, an der
 * gestoppt wurde, wird gemerkt (geraeteweise, in localStorage), und ueber die
 * MediaSession steht auf dem Sperrbildschirm, was da laeuft.
 */
export function AudioPlayer({
  id,
  src,
  titel,
  untertitel,
  peaks,
  durationSec,
}: {
  id: string
  src: string
  titel: string
  untertitel: string
  peaks: number[]
  durationSec: number | null
}) {
  const audio = useRef<HTMLAudioElement | null>(null)
  const [laeuft, setLaeuft] = useState(false)
  const [position, setPosition] = useState(0)
  const [dauer, setDauer] = useState(durationSec ?? 0)

  // Gemerkte Stelle wiederherstellen.
  useEffect(() => {
    try {
      const gespeichert = Number(window.localStorage.getItem(`${POSITION_PREFIX}${id}`))
      if (Number.isFinite(gespeichert) && gespeichert > 0) setPosition(gespeichert)
    } catch {
      // Kein Speicher, kein Drama – dann fängt es vorne an.
    }
  }, [id])

  function merken(sekunden: number) {
    try {
      // Ganz am Ende wieder vergessen, sonst startet die nächste Runde am Schluss.
      if (dauer > 0 && sekunden >= dauer - 1) {
        window.localStorage.removeItem(`${POSITION_PREFIX}${id}`)
      } else {
        window.localStorage.setItem(`${POSITION_PREFIX}${id}`, String(Math.floor(sekunden)))
      }
    } catch {
      // Siehe oben.
    }
  }

  function medienInfoSetzen() {
    if (!('mediaSession' in navigator)) return
    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: titel,
        artist: untertitel,
        album: 'Sprössling',
      })
      navigator.mediaSession.setActionHandler('play', () => void starten())
      navigator.mediaSession.setActionHandler('pause', () => anhalten())
    } catch {
      // Nicht jeder Browser kann alles – der Ton läuft trotzdem.
    }
  }

  async function starten() {
    const element = audio.current
    if (!element) return
    if (position > 0 && Math.abs(element.currentTime - position) > 1) {
      element.currentTime = position
    }
    medienInfoSetzen()
    await element.play()
    setLaeuft(true)
  }

  function anhalten() {
    audio.current?.pause()
    setLaeuft(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <audio
        ref={audio}
        src={src}
        preload="metadata"
        onLoadedMetadata={(event) => {
          const wert = event.currentTarget.duration
          if (Number.isFinite(wert) && wert > 0) setDauer(wert)
        }}
        onTimeUpdate={(event) => {
          setPosition(event.currentTarget.currentTime)
          merken(event.currentTarget.currentTime)
        }}
        onEnded={() => {
          setLaeuft(false)
          setPosition(0)
          merken(dauer)
        }}
        onPause={() => setLaeuft(false)}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => (laeuft ? anhalten() : void starten())}
          aria-label={laeuft ? `${titel} anhalten` : `${titel} abspielen`}
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          {laeuft ? <Pause className="size-5" aria-hidden /> : <Play className="size-5" aria-hidden />}
        </button>
        <div className="min-w-0 flex-1">
          <Waveform
            peaks={peaks}
            fortschritt={dauer > 0 ? position / dauer : 0}
            label={`Wellenform von ${titel}`}
            onSeek={(anteil) => {
              const element = audio.current
              if (!element || dauer <= 0) return
              element.currentTime = anteil * dauer
              setPosition(element.currentTime)
            }}
          />
        </div>
        <p className="w-12 shrink-0 text-right text-sm tabular text-muted-foreground">
          {dauerText(dauer > 0 ? dauer - position : durationSec)}
        </p>
      </div>
    </div>
  )
}
