import { describe, expect, it } from 'vitest'
import { EINSTELLUNGEN, KACHELN, einstellungsPfade } from './menu'

describe('KACHELN', () => {
  it('hat eindeutige Ziele', () => {
    const hrefs = KACHELN.map((kachel) => kachel.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it('beginnt mit dem, was im Wochenbett zählt', () => {
    expect(KACHELN.slice(0, 4).map((k) => k.href)).toEqual([
      '/notfall',
      '/protokoll',
      '/tagebuch',
      '/vorrat',
    ])
  })

  it('hält die Beschriftungen kurz genug für zwei Spalten', () => {
    for (const kachel of KACHELN) {
      expect(kachel.label.length).toBeLessThanOrEqual(22)
      expect(kachel.label).not.toMatch(/!/)
    }
  })

  it('führt keine Einstellungen als Bereich', () => {
    for (const kachel of KACHELN) expect(kachel.href).not.toMatch(/^\/mehr\//)
  })
})

describe('EINSTELLUNGEN', () => {
  it('verliert keinen der bisherigen Einstellungspfade', () => {
    // Beim Umbau von der langen Liste auf Kacheln plus Unterseite darf keine
    // Seite unerreichbar werden.
    const vorher = [
      '/mehr/kind',
      '/mehr/notfall',
      '/mehr/einladung',
      '/mehr/benachrichtigungen',
      '/mehr/anzeige',
      '/mehr/nachtmodus',
      '/mehr/darstellung',
      '/mehr/export',
      '/mehr/daten',
      '/mehr/integrationen',
    ]
    const jetzt = einstellungsPfade()
    for (const pfad of vorher) expect(jetzt).toContain(pfad)
  })

  it('hat eindeutige Ziele über alle Gruppen', () => {
    const pfade = einstellungsPfade()
    expect(new Set(pfade).size).toBe(pfade.length)
  })

  it('erklärt jede Zeile in einem Halbsatz', () => {
    for (const gruppe of EINSTELLUNGEN) {
      expect(gruppe.titel.length).toBeGreaterThan(0)
      for (const link of gruppe.links) {
        expect(link.hinweis.length).toBeGreaterThan(5)
        expect(link.hinweis).not.toMatch(/!/)
      }
    }
  })

  it('bleibt bei drei Gruppen mit höchstens vier Zeilen', () => {
    expect(EINSTELLUNGEN).toHaveLength(3)
    for (const gruppe of EINSTELLUNGEN) {
      expect(gruppe.links.length).toBeLessThanOrEqual(4)
    }
  })
})
