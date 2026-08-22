import 'server-only'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { cache } from 'react'
import matter from 'gray-matter'

/**
 * Woche-fuer-Woche-Inhalte.
 *
 * Die Dateien liegen als Markdown mit Frontmatter unter
 * `content/weeks/de/week-NNN.md`. Bis Woche 52 gibt es eine Datei je Woche;
 * danach ist der Inhalt monatsweise gebuendelt – eine Datei deckt dann den
 * jeweiligen Lebensmonat ab. `weekContent()` sucht deshalb immer die letzte
 * Datei, deren Wochennummer nicht groesser als die gesuchte Woche ist.
 */

export const CONTENT_DIR = path.join(process.cwd(), 'content', 'weeks', 'de')
export const MAX_CONTENT_WEEK = 156

export type WeekSection = { heading: string; body: string }

export type WeekContent = {
  /** Wochennummer, ab der dieser Eintrag gilt. */
  week: number
  title: string
  /** Menschenlesbares Alter, z. B. "3 Monate". */
  ageLabel: string
  /** Bis zu welcher Woche der Eintrag gilt (einschliesslich). */
  untilWeek: number
  /** Deckt der Eintrag mehrere Wochen ab (monatsweise Buendelung)? */
  bundled: boolean
  sections: WeekSection[]
}

type RawEntry = { week: number; title: string; ageLabel: string; sections: WeekSection[] }

/** Zerlegt den Markdown-Text an den `##`-Ueberschriften. */
function parseSections(markdown: string): WeekSection[] {
  const sections: WeekSection[] = []
  let heading: string | null = null
  let body: string[] = []

  const flush = () => {
    if (heading !== null) {
      sections.push({ heading, body: body.join('\n').trim() })
    }
    body = []
  }

  for (const line of markdown.split('\n')) {
    const match = /^##\s+(.+)$/.exec(line.trim())
    if (match) {
      flush()
      heading = match[1]!.trim()
    } else if (heading !== null) {
      body.push(line)
    }
  }
  flush()

  return sections.filter((section) => section.body.length > 0)
}

const loadAll = cache(async (): Promise<WeekContent[]> => {
  const files = (await readdir(CONTENT_DIR)).filter((name) => /^week-\d{3}\.md$/.test(name)).sort()

  const raw: RawEntry[] = []
  for (const file of files) {
    const source = await readFile(path.join(CONTENT_DIR, file), 'utf8')
    const parsed = matter(source)
    const data = parsed.data as { week?: number; title?: string; ageLabel?: string }
    const week = typeof data.week === 'number' ? data.week : Number(file.slice(5, 8))

    raw.push({
      week,
      title: data.title ?? `Woche ${week}`,
      ageLabel: data.ageLabel ?? '',
      sections: parseSections(parsed.content),
    })
  }

  raw.sort((a, b) => a.week - b.week)

  return raw.map((entry, index) => {
    const next = raw[index + 1]
    const untilWeek = next ? next.week - 1 : MAX_CONTENT_WEEK
    return { ...entry, untilWeek, bundled: untilWeek > entry.week }
  })
})

export async function allWeekContent(): Promise<WeekContent[]> {
  return loadAll()
}

/** Der Eintrag, der fuer die angegebene Lebenswoche gilt. */
export async function weekContent(week: number): Promise<WeekContent | null> {
  const entries = await loadAll()
  if (entries.length === 0) return null

  const target = Math.max(0, Math.min(MAX_CONTENT_WEEK, Math.floor(week)))
  let match: WeekContent | null = null
  for (const entry of entries) {
    if (entry.week <= target) match = entry
    else break
  }
  return match
}
