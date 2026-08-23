/**
 * Geometrie fuer das gezeichnete Gebiss.
 *
 * Beide Reihen liegen auf einem Ellipsenbogen: der Oberkiefer nach oben
 * gewoelbt, der Unterkiefer als Spiegelbild darunter. Jeder Zahn steht
 * senkrecht auf dem Bogen, damit die Zeichnung so aussieht wie ein Blick in
 * den Mund und nicht wie zwei Reihen Kacheln.
 *
 * Die Rechnung steht hier und nicht in der Komponente, damit sie testbar ist.
 */
import { reihe, type Kiefer, type Zahn } from './schema'

export const CHART_BREITE = 300
export const CHART_HOEHE = 340

const MITTE_X = CHART_BREITE / 2
const RADIUS_X = 108
const RADIUS_Y = 92
/** Mittelpunkt der beiden Boegen – sie liegen Ruecken an Ruecken. */
const OBEN_Y = 118
const UNTEN_Y = 222

/** Schneidezaehne sind schmal und hoch, Backenzaehne breit und flach. */
const FORM: Record<number, { breite: number; hoehe: number; radius: number }> = {
  1: { breite: 19, hoehe: 24, radius: 5 },
  2: { breite: 18, hoehe: 23, radius: 5 },
  3: { breite: 18, hoehe: 25, radius: 9 },
  4: { breite: 23, hoehe: 23, radius: 6 },
  5: { breite: 25, hoehe: 24, radius: 6 },
}

export type ZahnPosition = {
  zahn: Zahn
  x: number
  y: number
  /** Drehung in Grad, damit der Zahn senkrecht auf dem Bogen steht. */
  rotation: number
  breite: number
  hoehe: number
  radius: number
}

export function zahnPositionen(kiefer: Kiefer): ZahnPosition[] {
  const zaehne = reihe(kiefer)
  const mittelY = kiefer === 'oben' ? OBEN_Y : UNTEN_Y
  // Der Unterkiefer ist der an der Waagrechten gespiegelte Oberkiefer.
  const spiegel = kiefer === 'oben' ? 1 : -1

  return zaehne.map((zahn, index) => {
    // Winkel ueber den oberen Halbbogen, mittig in jedem der zehn Faecher.
    const t = Math.PI + ((index + 0.5) / zaehne.length) * Math.PI
    const x = MITTE_X + RADIUS_X * Math.cos(t)
    const y = mittelY + spiegel * RADIUS_Y * Math.sin(t)

    // Aussennormale der Ellipse – daraus die Drehung des Zahns.
    const nx = RADIUS_X * Math.cos(t)
    const ny = spiegel * RADIUS_Y * Math.sin(t)
    const rotation = (Math.atan2(ny, nx) * 180) / Math.PI + 90

    const form = FORM[zahn.position] ?? FORM[1]!
    return { zahn, x, y, rotation, ...form }
  })
}
