import { CloudOff } from 'lucide-react'

export const metadata = { title: 'Offline' }

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <CloudOff className="size-10 text-muted-foreground" aria-hidden />
      <h1 className="font-display text-2xl font-bold">Gerade keine Verbindung</h1>
      <p className="max-w-sm text-muted-foreground">
        Diese Seite ist noch nicht offline verfügbar. Bereits geöffnete Seiten und alle
        Schnellaktionen funktionieren weiter – Einträge werden gespeichert und automatisch
        übertragen, sobald du wieder online bist.
      </p>
    </main>
  )
}
