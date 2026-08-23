import { describe, expect, it } from 'vitest'
import { navItemsFor } from './nav-items'

const hrefs = (input: { hasChild: boolean; hasPregnancy: boolean }) =>
  navItemsFor(input).map((item) => item.href)

describe('navItemsFor', () => {
  it('bleibt bei höchstens fünf Zielen', () => {
    for (const hasChild of [true, false]) {
      for (const hasPregnancy of [true, false]) {
        expect(navItemsFor({ hasChild, hasPregnancy }).length).toBeLessThanOrEqual(5)
      }
    }
  })

  it('zeigt vor der Geburt die SSW-Ansicht statt Verlauf und Entwicklung', () => {
    expect(hrefs({ hasChild: false, hasPregnancy: true })).toEqual([
      '/heute',
      '/schwangerschaft',
      '/eltern',
      '/mehr',
    ])
  })

  it('kommt ganz ohne Kind und Schwangerschaft mit drei Zielen aus', () => {
    expect(hrefs({ hasChild: false, hasPregnancy: false })).toEqual(['/heute', '/eltern', '/mehr'])
  })

  it('zeigt mit Kind Verlauf und Entwicklung', () => {
    expect(hrefs({ hasChild: true, hasPregnancy: false })).toEqual([
      '/heute',
      '/verlauf',
      '/eltern',
      '/entwicklung',
      '/mehr',
    ])
  })

  it('verdrängt bei paralleler Schwangerschaft die Entwicklungsseite', () => {
    expect(hrefs({ hasChild: true, hasPregnancy: true })).toEqual([
      '/heute',
      '/verlauf',
      '/eltern',
      '/schwangerschaft',
      '/mehr',
    ])
  })

  it('hat den Eltern-Tab immer dabei', () => {
    for (const hasChild of [true, false]) {
      for (const hasPregnancy of [true, false]) {
        expect(hrefs({ hasChild, hasPregnancy })).toContain('/eltern')
      }
    }
  })
})
