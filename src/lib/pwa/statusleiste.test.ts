import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { LEISTE_NACHT, LEISTE_TAG, leistenfarbe, setzeLeistenfarbe } from './statusleiste'

/**
 * Die Leistenfarbe muss exakt dem Seitenhintergrund entsprechen. Weicht sie
 * ab, steht auf dem iPhone eine feine Kante zwischen Systemleiste und App –
 * genau der Streifen, wegen dem dieser Baustein entstanden ist.
 */
function hintergrundAusCss(block: 'tag' | 'nacht'): string {
  const css = readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf8')
  const start =
    block === 'tag' ? css.indexOf('  :root {') : css.indexOf("  [data-theme='night'] {")
  const abschnitt = css.slice(start, css.indexOf('}', start))
  const treffer = /--background:\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/.exec(abschnitt)
  if (!treffer) throw new Error(`--background nicht gefunden im Block ${block}`)
  return hslZuHex(Number(treffer[1]), Number(treffer[2]), Number(treffer[3]))
}

function hslZuHex(h: number, s: number, l: number): string {
  const sN = s / 100
  const lN = l / 100
  const c = (1 - Math.abs(2 * lN - 1)) * sN
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = lN - c / 2
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x]
  const zu = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${zu(r)}${zu(g)}${zu(b)}`
}

describe('Leistenfarbe', () => {
  it('entspricht dem Tageshintergrund aus globals.css', () => {
    expect(LEISTE_TAG).toBe(hintergrundAusCss('tag'))
  })

  it('entspricht dem Nachthintergrund aus globals.css', () => {
    expect(LEISTE_NACHT).toBe(hintergrundAusCss('nacht'))
  })

  it('wählt nach Thema', () => {
    expect(leistenfarbe('day')).toBe(LEISTE_TAG)
    expect(leistenfarbe('night')).toBe(LEISTE_NACHT)
  })
})

describe('setzeLeistenfarbe', () => {
  it('setzt alle Marken, nicht nur die erste', () => {
    // Es gibt eine je Systemdarstellung. Bliebe eine davon stehen, gaebe sie
    // bei passender Medienabfrage den Ton an und die App-Entscheidung waere weg.
    document.head.innerHTML = `
      <meta name="theme-color" media="(prefers-color-scheme: light)" content="${LEISTE_TAG}">
      <meta name="theme-color" media="(prefers-color-scheme: dark)" content="${LEISTE_NACHT}">
    `
    setzeLeistenfarbe('night', document)
    const werte = [...document.querySelectorAll('meta[name="theme-color"]')].map((m) =>
      m.getAttribute('content'),
    )
    expect(werte).toEqual([LEISTE_NACHT, LEISTE_NACHT])
  })

  it('kommt ohne Marken aus, statt zu werfen', () => {
    document.head.innerHTML = ''
    expect(() => setzeLeistenfarbe('day', document)).not.toThrow()
  })
})
