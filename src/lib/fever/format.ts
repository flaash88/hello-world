import { localeTag } from '@/lib/i18n'

/**
 * Formulierungen, die Bildschirm und Papier teilen. Stünden sie zweimal da,
 * hieße dieselbe Zahl auf dem Zettel für die Ordination irgendwann anders als
 * in der App.
 */

export function grad(value: number): string {
  return `${value.toLocaleString(localeTag(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })} °C`
}

export function dosis(gabe: { doseMl: number | null; doseMg: number | null }): string {
  const teile: string[] = []
  if (gabe.doseMl !== null) teile.push(`${gabe.doseMl.toLocaleString(localeTag())} ml`)
  if (gabe.doseMg !== null) teile.push(`${gabe.doseMg.toLocaleString(localeTag())} mg`)
  return teile.join(' · ')
}

/** Trinken und Windeln der letzten 24 Stunden in einem Satz. */
export function tagText(tag: {
  trinkmengeMl: number
  stillminuten: number
  windelnNass: number
  windelnStuhl: number
}): string {
  const teile: string[] = [
    tag.trinkmengeMl > 0 ? `${tag.trinkmengeMl} ml aus der Flasche` : 'keine Flasche',
  ]
  if (tag.stillminuten > 0) teile.push(`${tag.stillminuten} Min gestillt`)
  teile.push(`${tag.windelnNass} nasse, ${tag.windelnStuhl} volle Windeln`)
  return teile.join(' · ')
}
