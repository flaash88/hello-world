import { describe, expect, it } from 'vitest'
import { aufnahmezeitAus, aufnahmezeitAusDatei } from './aufnahmezeit'

const JETZT = new Date('2026-08-24T08:00:00Z')

describe('aufnahmezeitAus', () => {
  it('liest das EXIF-Datumsfeld', () => {
    const zeit = aufnahmezeitAus('Exif\0\0...2026:08:23 20:04:11...', JETZT)
    expect(zeit).not.toBe(null)
    expect(zeit!.getFullYear()).toBe(2026)
    expect(zeit!.getMonth()).toBe(7)
    expect(zeit!.getDate()).toBe(23)
    expect(zeit!.getHours()).toBe(20)
    expect(zeit!.getMinutes()).toBe(4)
  })

  it('nimmt das erste Datum, wenn mehrere drinstehen', () => {
    const zeit = aufnahmezeitAus('2026:08:23 20:04:11 und 2026:08:24 07:00:00', JETZT)
    expect(zeit!.getDate()).toBe(23)
  })

  it('gibt ohne Datum null zurück', () => {
    expect(aufnahmezeitAus('', JETZT)).toBe(null)
    expect(aufnahmezeitAus('keine Zahlen hier', JETZT)).toBe(null)
    expect(aufnahmezeitAus('2026-08-23 20:04:11', JETZT)).toBe(null)
  })

  it('verwirft eine ungestellte Kamerauhr', () => {
    expect(aufnahmezeitAus('1970:01:01 00:00:00', JETZT)).toBe(null)
    expect(aufnahmezeitAus('1980:06:15 12:00:00', JETZT)).toBe(null)
  })

  it('verwirft Datumsangaben aus der Zukunft', () => {
    expect(aufnahmezeitAus('2027:01:01 12:00:00', JETZT)).toBe(null)
    // Ein Tag Kulanz für falsch gestellte Zeitzonen.
    expect(aufnahmezeitAus('2026:08:24 20:00:00', JETZT)).not.toBe(null)
  })

  it('verwirft einen unmöglichen Monat', () => {
    // Der 13. Monat rollt in JavaScript ins Folgejahr – das ist dann Zukunft.
    expect(aufnahmezeitAus('2026:13:01 12:00:00', JETZT)).toBe(null)
  })
})

describe('aufnahmezeitAusDatei', () => {
  it('findet das Datum im Dateikopf', async () => {
    const blob = new Blob([`\xff\xd8\xff\xe1Exif\0\0 2026:08:23 20:04:11 `], {
      type: 'image/jpeg',
    })
    const zeit = await aufnahmezeitAusDatei(blob, JETZT)
    expect(zeit).not.toBe(null)
    expect(zeit!.getDate()).toBe(23)
  })

  it('bleibt ohne EXIF still', async () => {
    const blob = new Blob(['nur irgendwelche Bytes'], { type: 'image/jpeg' })
    expect(await aufnahmezeitAusDatei(blob, JETZT)).toBe(null)
  })

  it('verändert die Datei nicht', async () => {
    const blob = new Blob(['2026:08:23 20:04:11'], { type: 'image/jpeg' })
    const vorher = blob.size
    await aufnahmezeitAusDatei(blob, JETZT)
    expect(blob.size).toBe(vorher)
  })
})
