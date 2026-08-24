'use client'
import { useRef, useState } from 'react'
import Image from 'next/image'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { aufnahmezeitAusDatei } from '@/lib/media/aufnahmezeit'
import { groesseText, verkleinereBild } from '@/lib/media/verkleinern'

export type UploadedPhoto = {
  id: string
  path: string
  thumbPath: string
  takenAt: string | null
}

function csrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)sp_csrf=([^;]+)/)
  return match?.[1] ? decodeURIComponent(match[1]) : ''
}

/**
 * Bild-Upload mit sofortiger Vorschau. Die Bilder werden direkt hochgeladen
 * und erst beim Speichern dem Eintrag zugeordnet – so geht nichts verloren,
 * wenn der Text noch nicht fertig ist.
 */
export function PhotoUpload({
  childId,
  photos,
  onChange,
  onTakenAt,
  max = 12,
  label = 'Fotos hinzufügen',
}: {
  childId: string
  photos: UploadedPhoto[]
  onChange: (photos: UploadedPhoto[]) => void
  onTakenAt?: (takenAt: string) => void
  /** Höchstzahl Bilder – beim Meilenstein ist genau eines gemeint. */
  max?: number
  label?: string
}) {
  const [uploading, setUploading] = useState(false)
  const [fortschritt, setFortschritt] = useState<{ fertig: number; gesamt: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  async function upload(files: FileList) {
    setUploading(true)
    const room = Math.max(0, max - photos.length)
    const auswahl = Array.from(files).slice(0, room)
    setFortschritt(auswahl.length > 1 ? { fertig: 0, gesamt: auswahl.length } : null)

    const neue: UploadedPhoto[] = []
    const fehler: string[] = []

    try {
      // Ein Bild pro Anfrage. Ein Handyfoto hat mehrere Megabyte; gebündelt
      // wurde daraus ein Upload, der über Mobilfunk lange genug dauerte, um
      // abzubrechen – und dann war die ganze Auswahl verloren statt eines
      // Bildes.
      for (const [index, original] of auswahl.entries()) {
        try {
          // Das Aufnahmedatum steht in den EXIF-Daten, die das Verkleinern
          // entfernt. Also vorher lesen und getrennt mitschicken.
          const aufgenommen = await aufnahmezeitAusDatei(original)
          const { datei, verkleinert, vorherBytes } = await verkleinereBild(original)

          const form = new FormData()
          form.set('childId', childId)
          form.append('files', datei)
          if (aufgenommen) form.set('takenAt', aufgenommen.toISOString())

          const ergebnis = await sendeEinzeln(form, datei, verkleinert, vorherBytes)
          if ('fehler' in ergebnis) fehler.push(`${original.name}: ${ergebnis.fehler}`)
          else neue.push(...ergebnis.erstellt)
        } catch {
          // Ein Bild, an dem der Browser scheitert, darf die anderen nicht
          // mitnehmen.
          fehler.push(`${original.name}: konnte nicht gelesen werden.`)
        }
        setFortschritt(auswahl.length > 1 ? { fertig: index + 1, gesamt: auswahl.length } : null)
      }

      if (neue.length > 0) {
        onChange([...photos, ...neue])
        const mitDatum = neue.find((photo) => photo.takenAt)
        if (mitDatum?.takenAt && onTakenAt) onTakenAt(mitDatum.takenAt)
      }
      if (fehler.length > 0) {
        toast({
          title:
            neue.length > 0
              ? `${fehler.length} von ${auswahl.length} nicht hochgeladen`
              : 'Nicht hochgeladen',
          description: fehler[0],
          variant: 'destructive',
        })
      }
    } finally {
      setUploading(false)
      setFortschritt(null)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  /**
   * Ein einzelnes Bild hochladen und den Fehler benennen, statt jeden
   * Fehlschlag als "keine Verbindung" auszugeben. Der Unterschied zwischen
   * einem abgelehnten Format, einem zu großen Bild und einer abgebrochenen
   * Verbindung ist genau der, den man braucht, um etwas dagegen zu tun.
   */
  async function sendeEinzeln(
    form: FormData,
    datei: File,
    verkleinert: boolean,
    vorherBytes: number,
  ): Promise<{ erstellt: UploadedPhoto[] } | { fehler: string }> {
    const hinweis = verkleinert
      ? ` (verkleinert von ${groesseText(vorherBytes)} auf ${groesseText(datei.size)})`
      : ` (${groesseText(datei.size)})`

    let response: Response
    try {
      response = await fetch('/api/media', {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken() },
        body: form,
      })
    } catch {
      return {
        fehler: navigator.onLine
          ? `Die Verbindung brach beim Hochladen ab${hinweis}. Bei schlechtem Empfang hilft es, es einzeln zu versuchen.`
          : 'Gerade keine Verbindung. Fotos brauchen eine Verbindung – sie lassen sich nicht in die Offline-Warteschlange legen.',
      }
    }

    // Die Antwort kann HTML sein, wenn ein Proxy dazwischen abbricht. Dann ist
    // der Statuscode die einzige verlässliche Auskunft.
    let data: { created?: UploadedPhoto[]; failed?: string[]; error?: string } = {}
    try {
      data = (await response.json()) as typeof data
    } catch {
      if (!response.ok) {
        return {
          fehler: `Der Server hat abgelehnt (Fehler ${response.status})${hinweis}.`,
        }
      }
      return { fehler: 'Der Server hat unverständlich geantwortet.' }
    }

    if (!response.ok) {
      return { fehler: `${data.error ?? `Fehler ${response.status}`}${hinweis}` }
    }
    if (data.failed && data.failed.length > 0) {
      return { fehler: data.failed[0] as string }
    }
    return { erstellt: data.created ?? [] }
  }

  async function remove(photo: UploadedPhoto) {
    onChange(photos.filter((entry) => entry.id !== photo.id))
    await fetch('/api/media', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken() },
      body: JSON.stringify({ id: photo.id }),
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={max > 1}
        className="sr-only"
        aria-label="Fotos auswählen"
        onChange={(event) => {
          if (event.target.files && event.target.files.length > 0) void upload(event.target.files)
        }}
      />
      {photos.length < max && (
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="animate-spin" aria-hidden /> : <ImagePlus aria-hidden />}
          {uploading
            ? fortschritt
              ? `Lädt hoch … ${fortschritt.fertig} von ${fortschritt.gesamt}`
              : 'Lädt hoch …'
            : label}
        </Button>
      )}

      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <li key={photo.id} className="relative">
              <Image
                src={`/api/uploads/${photo.thumbPath}`}
                alt=""
                width={160}
                height={160}
                className="aspect-square w-full rounded-lg object-cover"
                unoptimized
              />
              <button
                type="button"
                onClick={() => void remove(photo)}
                aria-label="Foto entfernen"
                className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow"
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
