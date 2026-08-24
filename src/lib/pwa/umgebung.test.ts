import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  druckenMoeglich,
  umgebungAusBrowser,
  istIOS,
  istIOSStandalone,
  istStandalone,
  type Umgebung,
} from './umgebung'

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const IPAD =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'
const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
const MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function umgebung(teile: Partial<Umgebung> = {}): Umgebung {
  return { displayMode: false, userAgent: ANDROID, maxTouchPoints: 0, ...teile }
}

describe('istIOS', () => {
  it('erkennt das iPhone am Kennzeichen', () => {
    expect(istIOS(umgebung({ userAgent: IPHONE }))).toBe(true)
  })

  it('erkennt das iPad, das sich als Macintosh ausgibt, an den Berührungspunkten', () => {
    expect(istIOS(umgebung({ userAgent: IPAD, maxTouchPoints: 5 }))).toBe(true)
  })

  it('hält einen echten Mac nicht für ein iPad', () => {
    expect(istIOS(umgebung({ userAgent: MAC, maxTouchPoints: 0 }))).toBe(false)
  })

  it('hält Android nicht für iOS', () => {
    expect(istIOS(umgebung({ userAgent: ANDROID }))).toBe(false)
  })
})

describe('istStandalone', () => {
  it('erkennt den Start vom Startbildschirm auf iOS', () => {
    expect(istStandalone(umgebung({ userAgent: IPHONE, standalone: true }))).toBe(true)
  })

  it('erkennt die installierte App auf Android am Anzeigemodus', () => {
    expect(istStandalone(umgebung({ displayMode: true }))).toBe(true)
  })

  it('ist im gewöhnlichen Browser aus', () => {
    expect(istStandalone(umgebung({ userAgent: IPHONE, standalone: false }))).toBe(false)
  })
})

describe('druckenMoeglich', () => {
  it('bietet in der installierten App auf dem iPhone kein Drucken an', () => {
    // Dort bewirkt window.print() nichts – ein Knopf dafür wäre eine Lüge.
    expect(druckenMoeglich(umgebung({ userAgent: IPHONE, standalone: true }))).toBe(false)
  })

  it('bietet es im Safari auf demselben Gerät an', () => {
    expect(druckenMoeglich(umgebung({ userAgent: IPHONE, standalone: false }))).toBe(true)
  })

  it('bietet es in der installierten App auf Android an', () => {
    expect(druckenMoeglich(umgebung({ userAgent: ANDROID, displayMode: true }))).toBe(true)
  })

  it('bietet es am Rechner an', () => {
    expect(druckenMoeglich(umgebung({ userAgent: MAC }))).toBe(true)
  })

  it('erkennt auch das installierte iPad ohne navigator.standalone', () => {
    const ipad = umgebung({ userAgent: IPAD, maxTouchPoints: 5, displayMode: true })
    expect(istIOSStandalone(ipad)).toBe(true)
    expect(druckenMoeglich(ipad)).toBe(false)
  })
})

describe('umgebungAusBrowser', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('liest zusammen, was der Browser über sich sagt', () => {
    vi.stubGlobal('matchMedia', (abfrage: string) => ({
      matches: abfrage === '(display-mode: standalone)',
    }))
    Object.defineProperty(window.navigator, 'maxTouchPoints', {
      value: 5,
      configurable: true,
    })

    const u = umgebungAusBrowser()
    expect(u.displayMode).toBe(true)
    expect(u.maxTouchPoints).toBe(5)
    expect(u.userAgent).toBe(window.navigator.userAgent)
    // jsdom ist kein iOS, also gibt es navigator.standalone nicht.
    expect(u.standalone).toBeUndefined()
  })
})
