'use client'
import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Zeigt den Installations-Button nur, wenn der Browser ihn tatsaechlich
 * anbietet – und einen kurzen iOS-Hinweis, wo Safari keinen anbietet.
 */
export function InstallHint() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [isIos, setIsIos] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true
    setInstalled(standalone)
    setIsIos(/iPad|iPhone|iPod/.test(window.navigator.userAgent) && !standalone)

    const onPrompt = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as InstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', () => setInstalled(true))
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  if (installed || (!promptEvent && !isIos)) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Download className="size-4 text-muted-foreground" aria-hidden />
          Auf den Startbildschirm legen
        </CardTitle>
        <CardDescription>
          Als installierte App startet Sprössling schneller und funktioniert auch offline.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {promptEvent ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              await promptEvent.prompt()
              const choice = await promptEvent.userChoice
              if (choice.outcome === 'accepted') setInstalled(true)
              setPromptEvent(null)
            }}
          >
            Jetzt installieren
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            In Safari: Teilen-Symbol antippen, dann „Zum Home-Bildschirm“.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
