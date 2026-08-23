import { describe, expect, it } from 'vitest'
import { absoluteUrl } from './urls'

describe('absoluteUrl', () => {
  it('haengt den Pfad an die oeffentliche Adresse', () => {
    expect(absoluteUrl('/heute', 'https://sproessling.example.org')).toBe(
      'https://sproessling.example.org/heute',
    )
    expect(absoluteUrl('/', 'https://sproessling.example.org/')).toBe(
      'https://sproessling.example.org/',
    )
  })

  it('laesst vollstaendige URLs unveraendert', () => {
    expect(absoluteUrl('https://anderswo.example/x', 'https://sproessling.example.org')).toBe(
      'https://anderswo.example/x',
    )
  })

  it('liefert ohne APP_URL lieber gar keinen Link', () => {
    expect(absoluteUrl('/heute', undefined)).toBeNull()
    expect(absoluteUrl('/heute', '')).toBeNull()
  })

  it('kommt mit Unsinn klar', () => {
    expect(absoluteUrl(undefined, 'https://sproessling.example.org')).toBeNull()
    expect(absoluteUrl('/heute', 'kein-schema')).toBeNull()
  })
})
