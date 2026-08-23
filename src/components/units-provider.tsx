'use client'
import { createContext, useContext } from 'react'
import { DEFAULT_UNITS, type UnitPrefs } from '@/lib/units'

/**
 * Die eingestellten Einheiten gelten fuer den ganzen Haushalt und aendern sich
 * praktisch nie – deshalb reicht ein einfacher Kontext ohne Zustand.
 */
const UnitsContext = createContext<UnitPrefs>(DEFAULT_UNITS)

export function UnitsProvider({
  units,
  children,
}: {
  units: UnitPrefs
  children: React.ReactNode
}) {
  return <UnitsContext.Provider value={units}>{children}</UnitsContext.Provider>
}

export function useUnits(): UnitPrefs {
  return useContext(UnitsContext)
}
