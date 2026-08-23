import 'server-only'
import { redirect } from 'next/navigation'
import { getAppContext } from '@/lib/household'
import { DASHBOARD_PATH } from '@/lib/settings/display'
import {
  featureState,
  routeErlaubt,
  type FeatureKey,
  type FeatureState,
} from '@/lib/settings/features'

/**
 * Der Feature-Zustand des aktuellen Haushalts. Liest aus dem ohnehin
 * geladenen App-Kontext – kostet also keine zusaetzliche Abfrage.
 */
export async function currentFeatures(): Promise<FeatureState> {
  const ctx = await getAppContext()
  return featureState({
    level: ctx.household.featureLevel,
    overrides: ctx.household.featureOverrides,
    pauseUntil: ctx.household.featurePauseUntil,
  })
}

/**
 * Wache am Anfang jeder Seite eines abschaltbaren Bereichs. Ist der Bereich
 * aus, landet man auf dem Dashboard – ohne Erklaerung und ohne Hinweis, dass
 * es die Seite gaebe. Wer sie zurueckwill, findet den Schalter dort, wo er
 * hingehoert.
 */
export async function requireFeature(key: FeatureKey): Promise<FeatureState> {
  const state = await currentFeatures()
  if (!state.aktiv.has(key)) redirect(DASHBOARD_PATH)
  return state
}

/** Dasselbe fuer einen Pfad statt eines Schluessels. */
export async function requireRoute(pfad: string): Promise<FeatureState> {
  const state = await currentFeatures()
  if (!routeErlaubt(state, pfad)) redirect(DASHBOARD_PATH)
  return state
}
