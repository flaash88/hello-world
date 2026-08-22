import Link from 'next/link'
import { FileText, Sparkles } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Automatisch erzeugter Wochenrueckblick – dieselbe Ansicht fuer beide,
 * damit man sich abends nicht gegenseitig den Tag rekapitulieren muss.
 */
export function WeeklyReviewCard({
  lines,
  childId,
}: {
  lines: string[]
  childId: string | null
}) {
  if (lines.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary" aria-hidden />
          Wochenrückblick
        </CardTitle>
        <CardDescription>Automatisch aus euren Einträgen – für euch beide gleich.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <ul className="flex flex-col gap-1.5 text-sm leading-relaxed">
          {lines.map((line) => (
            <li key={line} className="flex gap-2">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              {line}
            </li>
          ))}
        </ul>
        {childId && (
          <Link
            href={`/api/export/pdf?kind=${childId}`}
            className="mt-1 inline-flex min-h-12 items-center gap-1.5 text-sm font-semibold text-primary"
          >
            <FileText className="size-4" aria-hidden />
            Als PDF speichern
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
