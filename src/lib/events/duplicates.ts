/**
 * Doppelerfassung erkennen.
 *
 * Zwei Personen, ein Kind: wenn beide dieselbe Flasche eintragen, steht sie
 * zweimal in der Statistik und der Wachfenster-Median rutscht. Deshalb wird
 * beim Anlegen geprueft, ob kurz davor jemand anderes dasselbe eingetragen hat.
 *
 * Nicht blockieren. Der Eintrag wird gespeichert, und danach fragt die App
 * nach – nachts um drei ist ein Dialog, der das Speichern verhindert, das
 * Letzte, was jemand braucht.
 */

/** Kategorien, bei denen eine Doppelung ueberhaupt moeglich und stoerend ist. */
export const PRUEFBARE_TYPEN = [
  'sleep',
  'nursing',
  'bottle',
  'pumping',
  'solids',
  'diaper',
  'health',
] as const

/**
 * Ausgenommen: Ereignisse, bei denen eine Doppelung inhaltlich unmoeglich oder
 * unschaedlich ist. Impfungen und Untersuchungen haengen an ihrem Schluessel
 * und koennen gar nicht doppelt sein, Zahndurchbrueche ebenso; zwei
 * Gewichtsmessungen am selben Tag sind gewollt, und Milchportionen sind
 * absichtlich einzeln.
 */
export const AUSGENOMMENE_HEALTH_KINDS = ['vaccination'] as const

export const FENSTER_MINUTEN = 10
/** Schlaf laeuft ungenauer – wer wann hingelegt hat, ist Auslegungssache. */
export const FENSTER_SCHLAF_MINUTEN = 20
/**
 * Medikamente bekommen das groesste Fenster und den deutlichsten Hinweis:
 * bleibt die Doppelung stehen, glauben beide, die Dosis sei zweimal gegeben
 * worden.
 */
export const FENSTER_MEDIKAMENT_MINUTEN = 30

export type DuplikatKandidat = {
  id: string
  type: string
  startedAt: Date
  endedAt: Date | null
  payload: unknown
  createdById: string
  createdByName?: string
}

export type Neueintrag = {
  id: string
  type: string
  startedAt: Date
  endedAt: Date | null
  payload: unknown
  createdById: string
}

function payloadOf(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function healthKind(event: { type: string; payload: unknown }): string | null {
  if (event.type !== 'health') return null
  const kind = payloadOf(event.payload).kind
  return typeof kind === 'string' ? kind : 'temperature'
}

/** Wird dieser Typ ueberhaupt geprueft? */
export function istPruefbar(event: { type: string; payload: unknown }): boolean {
  if (!(PRUEFBARE_TYPEN as readonly string[]).includes(event.type)) return false
  const kind = healthKind(event)
  if (kind && (AUSGENOMMENE_HEALTH_KINDS as readonly string[]).includes(kind)) return false
  return true
}

/** Das Zeitfenster fuer diesen Eintrag, in Minuten. */
export function fensterMinuten(event: { type: string; payload: unknown }): number {
  if (event.type === 'sleep') return FENSTER_SCHLAF_MINUTEN
  if (healthKind(event) === 'medication') return FENSTER_MEDIKAMENT_MINUTEN
  return FENSTER_MINUTEN
}

/** Medikamentengaben werden deutlicher gemeldet als eine doppelte Windel. */
export function istDeutlich(event: { type: string; payload: unknown }): boolean {
  return healthKind(event) === 'medication'
}

function ueberlappen(a: Neueintrag, b: DuplikatKandidat): boolean {
  // Punkt-Ereignisse haben kein Ende – dann entscheidet allein der Abstand.
  if (!a.endedAt || !b.endedAt) return true
  return a.startedAt < b.endedAt && b.startedAt < a.endedAt
}

/**
 * Sucht unter den Kandidaten den wahrscheinlichsten Doppeleintrag.
 *
 * Bedingungen: gleiche Kategorie, andere Person, Startzeiten nah beieinander,
 * und bei Zeitraeumen ueberlappen sich die Zeitraeume. Bei Gesundheitseintraegen
 * zaehlt zusaetzlich, dass es dieselbe Art ist – eine Temperatur ist kein
 * Duplikat einer Medikamentengabe.
 */
export function findeDuplikat(
  neu: Neueintrag,
  kandidaten: readonly DuplikatKandidat[],
): DuplikatKandidat | null {
  if (!istPruefbar(neu)) return null

  const fenster = fensterMinuten(neu) * 60_000
  const neuKind = healthKind(neu)

  const treffer = kandidaten
    .filter((kandidat) => kandidat.id !== neu.id)
    .filter((kandidat) => kandidat.type === neu.type)
    .filter((kandidat) => kandidat.createdById !== neu.createdById)
    .filter((kandidat) => healthKind(kandidat) === neuKind)
    .filter(
      (kandidat) =>
        Math.abs(kandidat.startedAt.getTime() - neu.startedAt.getTime()) <= fenster,
    )
    .filter((kandidat) => ueberlappen(neu, kandidat))
    .sort(
      (a, b) =>
        Math.abs(a.startedAt.getTime() - neu.startedAt.getTime()) -
        Math.abs(b.startedAt.getTime() - neu.startedAt.getTime()),
    )

  return treffer[0] ?? null
}

/**
 * Felder, die beim Zusammenfuehren aus dem neueren Eintrag uebernommen werden:
 * alles, was dort gesetzt ist und im aelteren fehlt. Der aeltere bleibt
 * bestehen – er war zuerst da, und an ihm haengen womoeglich schon Timer.
 */
export function zusammengefuehrtePayload(
  aelter: unknown,
  neuer: unknown,
): Record<string, unknown> {
  const ziel = { ...payloadOf(aelter) }
  for (const [key, wert] of Object.entries(payloadOf(neuer))) {
    if (wert === null || wert === undefined || wert === '') continue
    if (ziel[key] === null || ziel[key] === undefined || ziel[key] === '') ziel[key] = wert
  }
  return ziel
}

/** "Sarah hat vor 4 Minuten auch eine Flasche eingetragen." */
export function hinweisText(
  name: string,
  label: string,
  minutenHer: number,
): string {
  const wann =
    minutenHer <= 0
      ? 'gerade eben'
      : minutenHer === 1
        ? 'vor einer Minute'
        : `vor ${minutenHer} Minuten`
  return `${name} hat ${wann} auch ${label} eingetragen.`
}

/** Artikel fuer den Hinweistext – "eine Flasche", "einen Schlaf". */
export const DUPLIKAT_LABEL: Record<string, string> = {
  sleep: 'einen Schlaf',
  nursing: 'eine Stillmahlzeit',
  bottle: 'eine Flasche',
  pumping: 'eine Abpump-Sitzung',
  solids: 'eine Beikost-Mahlzeit',
  diaper: 'eine Windel',
  health: 'einen Gesundheitseintrag',
}

export function duplikatLabel(event: { type: string; payload: unknown }): string {
  if (healthKind(event) === 'medication') return 'eine Medikamentengabe'
  if (healthKind(event) === 'temperature') return 'eine Temperatur'
  return DUPLIKAT_LABEL[event.type] ?? 'einen Eintrag'
}
