import { describe, expect, it } from 'vitest'
import {
  DASHBOARD_PATH,
  DEFAULT_QUICK_ACTIONS,
  MAX_QUICK_ACTIONS,
  parseQuickActions,
  parseStartScreen,
  startScreenPath,
} from './display'
import { DELETE_CONFIRMATION } from './deletion'

const BOTH = { hasChild: true, hasPregnancy: true }

describe('parseStartScreen', () => {
  it('nimmt bekannte Werte', () => {
    expect(parseStartScreen('verlauf')).toBe('verlauf')
  })

  it('faellt bei Unsinn auf das Dashboard zurueck', () => {
    expect(parseStartScreen('mond')).toBe('dashboard')
    expect(parseStartScreen(null)).toBe('dashboard')
    expect(parseStartScreen(undefined)).toBe('dashboard')
  })
})

describe('startScreenPath', () => {
  it('leitet auf die gewaehlte Seite', () => {
    expect(startScreenPath('verlauf', BOTH)).toBe('/verlauf')
    expect(startScreenPath('auswertung', BOTH)).toBe('/auswertung')
    expect(startScreenPath('schwangerschaft', BOTH)).toBe('/schwangerschaft')
    expect(startScreenPath('dashboard', BOTH)).toBe(DASHBOARD_PATH)
  })

  it('weicht aus, wenn die Seite nichts zeigen koennte', () => {
    expect(startScreenPath('verlauf', { hasChild: false, hasPregnancy: true })).toBe(DASHBOARD_PATH)
    expect(startScreenPath('auswertung', { hasChild: false, hasPregnancy: false })).toBe(DASHBOARD_PATH)
    expect(startScreenPath('schwangerschaft', { hasChild: true, hasPregnancy: false })).toBe(
      DASHBOARD_PATH,
    )
  })
})

describe('parseQuickActions', () => {
  it('nimmt bekannte Typen in der gespeicherten Reihenfolge', () => {
    expect(parseQuickActions(['diaper', 'sleep'])).toEqual(['diaper', 'sleep'])
  })

  it('wirft Unbekanntes weg', () => {
    expect(parseQuickActions(['sleep', 'kaffee'])).toEqual(['sleep'])
  })

  it('faellt auf die Voreinstellung zurueck, wenn nichts Brauchbares uebrig bleibt', () => {
    expect(parseQuickActions(['kaffee'])).toEqual(DEFAULT_QUICK_ACTIONS)
    expect(parseQuickActions([])).toEqual(DEFAULT_QUICK_ACTIONS)
    expect(parseQuickActions(null)).toEqual(DEFAULT_QUICK_ACTIONS)
    expect(parseQuickActions('sleep')).toEqual(DEFAULT_QUICK_ACTIONS)
  })

  it('deckelt bei der Hoechstzahl', () => {
    const all = ['sleep', 'nursing', 'bottle', 'pumping', 'solids', 'diaper', 'mood', 'health']
    expect(parseQuickActions(all)).toHaveLength(MAX_QUICK_ACTIONS)
  })
})

describe('Bestaetigungswort', () => {
  it('ist ein Wort, das man nicht versehentlich tippt', () => {
    expect(DELETE_CONFIRMATION).toBe('LÖSCHEN')
  })
})
