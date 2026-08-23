'use client'
import { useEffect, useRef, useState } from 'react'
import { Mic, Square } from 'lucide-react'
import { MAX_DAUER_SEK, dauerText, groesseText, istGross } from '@/lib/audio/notes'
import { cn } from '@/lib/utils'

export type Aufnahme = { bytes: ArrayBuffer; mimeType: string; dauerSek: number }

/**
 * Aufnahme mit einem grossen Knopf.
 *
 * Das Mikrofon wird erst angefragt, wenn wirklich aufgenommen werden soll –
 * eine Berechtigungsabfrage beim blossen Oeffnen der Seite hat sich noch nie
 * jemand gewuenscht. Nach drei Minuten stoppt die Aufnahme von selbst.
 */
export function Recorder({
  onFertig,
  disabled,
}: {
  onFertig: (aufnahme: Aufnahme) => void
  disabled?: boolean
}) {
  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const analyser = useRef<AnalyserNode | null>(null)
  const audioContext = useRef<AudioContext | null>(null)
  const rahmen = useRef<number | null>(null)
  const teile = useRef<Blob[]>([])
  const start = useRef<number>(0)

  const [laeuft, setLaeuft] = useState(false)
  const [sekunden, setSekunden] = useState(0)
  const [pegel, setPegel] = useState(0)
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => () => aufraeumen(), [])

  function aufraeumen() {
    if (rahmen.current !== null) cancelAnimationFrame(rahmen.current)
    rahmen.current = null
    analyser.current = null
    void audioContext.current?.close().catch(() => {})
    audioContext.current = null
    stream.current?.getTracks().forEach((track) => track.stop())
    stream.current = null
  }

  function pegelMessen() {
    const knoten = analyser.current
    if (!knoten) return
    const daten = new Uint8Array(knoten.frequencyBinCount)
    knoten.getByteTimeDomainData(daten)
    let summe = 0
    for (const wert of daten) {
      const abweichung = (wert - 128) / 128
      summe += abweichung * abweichung
    }
    setPegel(Math.min(1, Math.sqrt(summe / daten.length) * 3))
    rahmen.current = requestAnimationFrame(pegelMessen)
  }

  async function starten() {
    setFehler(null)
    try {
      // Erst hier fragt der Browser nach dem Mikrofon.
      const spur = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.current = spur

      const context = new AudioContext()
      audioContext.current = context
      const knoten = context.createAnalyser()
      knoten.fftSize = 512
      context.createMediaStreamSource(spur).connect(knoten)
      analyser.current = knoten
      rahmen.current = requestAnimationFrame(pegelMessen)

      teile.current = []
      const aufnehmer = new MediaRecorder(spur)
      aufnehmer.ondataavailable = (event) => {
        if (event.data.size > 0) teile.current.push(event.data)
      }
      aufnehmer.onstop = async () => {
        const dauerSek = Math.round((Date.now() - start.current) / 1000)
        const blob = new Blob(teile.current, { type: aufnehmer.mimeType || 'audio/webm' })
        aufraeumen()
        setLaeuft(false)
        setPegel(0)
        if (blob.size > 0) {
          onFertig({
            bytes: await blob.arrayBuffer(),
            mimeType: blob.type,
            dauerSek: Math.min(MAX_DAUER_SEK, dauerSek),
          })
        }
      }

      recorder.current = aufnehmer
      start.current = Date.now()
      aufnehmer.start()
      setLaeuft(true)
      setSekunden(0)
    } catch {
      aufraeumen()
      setFehler(
        'Kein Zugriff aufs Mikrofon. Erlaub es in den Browsereinstellungen – oder lad eine fertige Datei hoch.',
      )
    }
  }

  function stoppen() {
    if (recorder.current?.state === 'recording') recorder.current.stop()
  }

  // Laufzeit mitzählen und nach drei Minuten von selbst beenden.
  useEffect(() => {
    if (!laeuft) return
    const timer = window.setInterval(() => {
      const vergangen = Math.round((Date.now() - start.current) / 1000)
      setSekunden(vergangen)
      if (vergangen >= MAX_DAUER_SEK) stoppen()
    }, 250)
    return () => window.clearInterval(timer)
  }, [laeuft])

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => (laeuft ? stoppen() : void starten())}
        disabled={disabled}
        aria-label={laeuft ? 'Aufnahme beenden' : 'Aufnahme starten'}
        className={cn(
          'relative flex size-32 items-center justify-center rounded-full text-primary-foreground transition-transform active:scale-95 disabled:opacity-50',
          laeuft ? 'bg-destructive' : 'bg-primary',
        )}
      >
        {/* Pegel als Ring um den Knopf – man sieht, dass etwas ankommt. */}
        {laeuft && (
          <span
            aria-hidden
            className="absolute inset-0 rounded-full border-4 border-destructive/40"
            style={{ transform: `scale(${1 + pegel * 0.25})` }}
          />
        )}
        {laeuft ? <Square className="size-10" aria-hidden /> : <Mic className="size-10" aria-hidden />}
      </button>

      <p className="tabular text-lg font-semibold" aria-live="polite">
        {laeuft ? dauerText(sekunden) : 'Bereit'}
      </p>
      <p className="text-sm text-muted-foreground">
        Höchstens {Math.round(MAX_DAUER_SEK / 60)} Minuten. Danach stoppt die Aufnahme von selbst.
      </p>

      {fehler && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {fehler}
        </p>
      )}
    </div>
  )
}

/** Warnung fuer grosse Dateien – unterwegs zaehlt jedes Megabyte. */
export function GroessenHinweis({ bytes }: { bytes: number }) {
  if (!istGross(bytes)) return null
  return (
    <p className="text-sm text-muted-foreground">
      Die Aufnahme ist {groesseText(bytes)} groß. Über Mobilfunk dauert das Hochladen entsprechend –
      im WLAN geht es schneller.
    </p>
  )
}
