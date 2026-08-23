/**
 * Prueft die ausgelieferten Vorsorgedaten gegen das Schema. Das ist der Test,
 * der beim naechsten Impfplan-Stand anschlaegt, wenn die Datei nicht passt.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { impfplanSchema, untersuchungenSchema } from './schema'

const dir = path.join(process.cwd(), 'content', 'vorsorge')
const read = (file: string) => JSON.parse(readFileSync(path.join(dir, file), 'utf8'))

describe('Impfplan-Daten', () => {
  const plan = impfplanSchema.parse(read('impfplan-2025-2026.json'))

  it('traegt Quelle, Version und Stand', () => {
    expect(plan.quelle).toMatch(/Impfplan/)
    expect(plan.version).toBe('1.1')
    expect(plan.stand).toBe('2025-10-10')
  })

  it('haelt einen Pruefhinweis vor, solange nicht geprueft', () => {
    if (!plan.geprueft) {
      expect(plan.pruefhinweis?.length ?? 0).toBeGreaterThan(80)
    }
  })

  it('hat eindeutige Schluessel', () => {
    const keys = plan.impfungen.map((i) => i.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('nennt zu jedem belegten Fenster auch eine Quelle', () => {
    for (const impfung of plan.impfungen) {
      if (impfung.fenster) expect(impfung.quelle, impfung.key).not.toBeNull()
    }
  })

  it('laesst Eintraege ohne belegten Zeitraum bewusst leer', () => {
    const offen = plan.impfungen.filter((i) => i.fenster === null)
    expect(offen.length).toBeGreaterThan(0)
    for (const impfung of offen) {
      expect(impfung.hinweis, impfung.key).toMatch(/nachsehen/)
    }
  })

  it('haelt die Reihenfolge der Teilimpfungen ein', () => {
    const serien = new Map<string, number[]>()
    for (const impfung of plan.impfungen) {
      if (impfung.dosisNr === null) continue
      const serie = impfung.key.replace(/-\d+$/, '')
      serien.set(serie, [...(serien.get(serie) ?? []), impfung.dosisNr])
    }
    for (const [serie, dosen] of serien) {
      expect(dosen, serie).toEqual([...dosen].sort((a, b) => a - b))
    }
  })
})

describe('Eltern-Kind-Pass-Untersuchungen', () => {
  const daten = untersuchungenSchema.parse(read('ekp-untersuchungen.json'))

  it('kennt fuenf Untersuchungen der Mutter', () => {
    expect(daten.mutter.anzahl).toBe(5)
  })

  it('kennt zehn Untersuchungen des Kindes, durchgehend nummeriert', () => {
    expect(daten.kind).toHaveLength(10)
    expect(daten.kind.map((k) => k.nummer)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('reicht bis zum 62. Lebensmonat', () => {
    const letzte = daten.kind[daten.kind.length - 1]!
    expect(letzte.fenster?.bisMonaten).toBe(62)
  })

  it('sieht die Huefte in der 1. sowie in der 6. bis 8. Lebenswoche vor', () => {
    expect(daten.kind[0]!.inhalt).toMatch(/Hüft/)
    expect(daten.kind[1]!.inhalt).toMatch(/Hüft/)
  })

  it('macht die Augenuntersuchung zum eigenen Termin bei der Augenfachaerztin', () => {
    const augen = daten.kind.find((k) => k.separaterTermin)
    expect(augen).toBeDefined()
    expect(augen!.durchfuehrendeStelle).toMatch(/Augenheilkunde/)
    expect(augen!.fenster).toEqual({ vonMonaten: 21, bisMonaten: 26 })
  })

  it('kuerzt das Kinderbetreuungsgeld um 1300 Euro je fehlendem Nachweis', () => {
    expect(daten.kbg.kuerzungEuro).toBe(1300)
    expect(daten.kbg.fristen).toHaveLength(2)
    expect(daten.kbg.fristen[1]!.bisMonaten).toBe(15)
  })

  it('nennt nirgends mehr den Mutter-Kind-Pass', () => {
    expect(JSON.stringify(daten)).not.toMatch(/Mutter-Kind-Pass/)
  })
})
