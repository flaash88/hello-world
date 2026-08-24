/**
 * Was während des Ladens einer Seite steht.
 *
 * Ohne diese Datei bleibt beim Tab-Wechsel die alte Seite stehen, bis die neue
 * fertig vom Server kommt – über den Tunnel sind das ein paar hundert
 * Millisekunden, in denen nichts passiert und man ein zweites Mal tippt.
 *
 * Bewusst grau und ohne Text: kein Spinner, der sich dreht, keine Prozentzahl,
 * kein „lädt …". Nur die Umrisse dessen, was gleich kommt. Die Tab-Leiste und
 * der Kopf bleiben stehen, weil sie im Layout hängen und nicht hier.
 *
 * `animate-pulse` haengt an der Tailwind-Bewegung und ist damit automatisch
 * still, wenn das Geraet auf „Bewegung reduzieren" steht (siehe globals.css).
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Wird geladen</span>
      <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
      <div className="h-32 animate-pulse rounded-2xl bg-muted" />
      <div className="h-20 animate-pulse rounded-2xl bg-muted" />
      <div className="h-20 animate-pulse rounded-2xl bg-muted" />
    </div>
  )
}
