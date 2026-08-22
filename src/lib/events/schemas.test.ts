import { describe, expect, it } from 'vitest'
import { eventInputSchema, parsePayload } from './schemas'
import { EVENT_TYPES } from './types'

describe('parsePayload', () => {
  it('setzt Defaults', () => {
    const result = parsePayload('sleep', {})
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toMatchObject({ kind: 'nap' })
  })

  it('nimmt gueltige Werte an', () => {
    const result = parsePayload('bottle', { content: 'breastmilk', amountMl: 120 })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toMatchObject({ content: 'breastmilk', amountMl: 120 })
  })

  it('weist unbekannte Auswahlwerte zurueck', () => {
    expect(parsePayload('bottle', { content: 'cola' }).ok).toBe(false)
    expect(parsePayload('diaper', { kind: 'explodiert' }).ok).toBe(false)
  })

  it('begrenzt unsinnige Zahlen', () => {
    expect(parsePayload('bottle', { amountMl: 5000 }).ok).toBe(false)
    expect(parsePayload('health', { kind: 'temperature', temperatureC: 99 }).ok).toBe(false)
    expect(parsePayload('mood', { intensity: 9 }).ok).toBe(false)
  })

  it('verlangt bei Beikost mindestens ein Lebensmittel', () => {
    const empty = parsePayload('solids', { foods: [] })
    expect(empty.ok).toBe(false)
    if (!empty.ok) expect(empty.error).toContain('Lebensmittel')
    expect(parsePayload('solids', { foods: ['Karotte'] }).ok).toBe(true)
  })

  it('kennt fuer jeden Event-Typ ein Schema', () => {
    // Beikost ist der einzige Typ mit Pflichtfeld – alles andere kommt mit
    // einer leeren Payload aus und faellt auf Defaults zurueck.
    const minimal: Partial<Record<(typeof EVENT_TYPES)[number], unknown>> = {
      solids: { foods: ['Karotte'] },
    }
    for (const type of EVENT_TYPES) {
      expect(parsePayload(type, minimal[type] ?? {}).ok).toBe(true)
    }
  })
})

describe('eventInputSchema', () => {
  const base = { type: 'sleep' as const, startedAt: new Date(Date.now() - 3600_000).toISOString() }

  it('nimmt einen gueltigen Eintrag an', () => {
    expect(eventInputSchema.safeParse(base).success).toBe(true)
  })

  it('weist ein Ende vor dem Beginn zurueck', () => {
    const result = eventInputSchema.safeParse({
      ...base,
      endedAt: new Date(Date.now() - 7200_000).toISOString(),
    })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.message).toContain('Ende')
  })

  it('weist einen Beginn in der Zukunft zurueck', () => {
    const result = eventInputSchema.safeParse({
      ...base,
      startedAt: new Date(Date.now() + 3600_000).toISOString(),
    })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.message).toContain('Zukunft')
  })

  it('erlaubt eine kleine Toleranz fuer die Uhr des Geraets', () => {
    const result = eventInputSchema.safeParse({
      ...base,
      startedAt: new Date(Date.now() + 60_000).toISOString(),
    })
    expect(result.success).toBe(true)
  })

  it('weist kaputte Zeitstempel zurueck', () => {
    expect(eventInputSchema.safeParse({ ...base, startedAt: 'gestern' }).success).toBe(false)
  })
})
