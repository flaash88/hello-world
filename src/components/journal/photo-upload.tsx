'use client'
import { useRef, useState } from 'react'
import Image from 'next/image'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

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
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  async function upload(files: FileList) {
    setUploading(true)
    try {
      const form = new FormData()
      form.set('childId', childId)
      const room = Math.max(0, max - photos.length)
      for (const file of Array.from(files).slice(0, room)) form.append('files', file)

      const response = await fetch('/api/media', {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken() },
        body: form,
      })
      const data = (await response.json()) as {
        created?: UploadedPhoto[]
        failed?: string[]
        error?: string
      }

      if (!response.ok) {
        toast({ title: 'Upload fehlgeschlagen', description: data.error, variant: 'destructive' })
        return
      }
      if (data.failed && data.failed.length > 0) {
        toast({
          title: `${data.failed.length} Bild(er) abgelehnt`,
          description: data.failed[0],
          variant: 'destructive',
        })
      }
      if (data.created && data.created.length > 0) {
        onChange([...photos, ...data.created])
        // Das Aufnahmedatum des ersten Bildes als Vorschlag anbieten.
        const withDate = data.created.find((photo) => photo.takenAt)
        if (withDate?.takenAt && onTakenAt) onTakenAt(withDate.takenAt)
      }
    } catch {
      toast({
        title: 'Upload fehlgeschlagen',
        description: 'Keine Verbindung zum Server.',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
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
          {uploading ? 'Lädt hoch …' : label}
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
