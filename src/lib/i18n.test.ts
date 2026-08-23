import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE, LOCALES, contentLocaleDir, localeTag } from './i18n'

describe('i18n', () => {
  it('liefert für jede Sprache einen BCP-47-Tag', () => {
    for (const locale of LOCALES) {
      expect(localeTag(locale)).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/)
    }
  })

  it('nutzt ohne Angabe die Voreinstellung', () => {
    expect(localeTag()).toBe(localeTag(DEFAULT_LOCALE))
    expect(contentLocaleDir()).toBe(DEFAULT_LOCALE)
  })

  it('formatiert österreichisch – Jänner statt Januar', () => {
    const date = new Date(Date.UTC(2026, 0, 15, 12))
    expect(date.toLocaleDateString(localeTag(), { month: 'long', timeZone: 'UTC' })).toBe('Jänner')
  })

  it('nutzt das Dezimalkomma', () => {
    expect((1234.5).toLocaleString(localeTag(), { minimumFractionDigits: 1 })).toContain(',5')
  })
})
