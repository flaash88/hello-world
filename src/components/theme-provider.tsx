'use client'
import * as React from 'react'
import { isWithinWindow } from '@/lib/time'

export type ThemeMode = 'auto' | 'day' | 'night'
type Resolved = 'day' | 'night'

type ThemeContextValue = {
  mode: ThemeMode
  resolved: Resolved
  setMode: (mode: ThemeMode) => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)
const STORAGE_KEY = 'sp.theme-mode'

/**
 * Nachtmodus. Automatik richtet sich nach dem im Haushalt eingestellten
 * Fenster (Default 20:00–06:00); die manuelle Wahl gilt bis sie zurueckgesetzt
 * wird und liegt in localStorage, damit sie ohne Serverrunde greift.
 */
export function ThemeProvider({
  children,
  nightStart,
  nightEnd,
  autoEnabled,
}: {
  children: React.ReactNode
  nightStart: string
  nightEnd: string
  autoEnabled: boolean
}) {
  const [mode, setModeState] = React.useState<ThemeMode>('auto')
  const [resolved, setResolved] = React.useState<Resolved>('day')

  React.useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'day' || stored === 'night' || stored === 'auto') setModeState(stored)
  }, [])

  React.useEffect(() => {
    function apply() {
      const next: Resolved =
        mode === 'auto'
          ? autoEnabled && isWithinWindow(new Date(), nightStart, nightEnd)
            ? 'night'
            : 'day'
          : mode
      setResolved(next)
      document.documentElement.dataset.theme = next
      document.documentElement.style.colorScheme = next === 'night' ? 'dark' : 'light'
      const meta = document.querySelector('meta[name="theme-color"]')
      if (meta) meta.setAttribute('content', next === 'night' ? '#0b0908' : '#faf6f0')
    }
    apply()
    // Minuetlich pruefen reicht – der Wechsel darf ruhig ein paar Sekunden dauern.
    const timer = window.setInterval(apply, 60_000)
    const onVisible = () => document.visibilityState === 'visible' && apply()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [mode, nightStart, nightEnd, autoEnabled])

  const setMode = React.useCallback((next: ThemeMode) => {
    setModeState(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }, [])

  const value = React.useMemo(() => ({ mode, resolved, setMode }), [mode, resolved, setMode])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme muss innerhalb von <ThemeProvider> verwendet werden')
  return ctx
}
