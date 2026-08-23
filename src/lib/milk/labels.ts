import 'server-only'
import QRCode from 'qrcode'
import { absoluteUrl } from '@/lib/push/urls'

/**
 * Etiketten fuer die Gefrierbeutel.
 *
 * Format 70 × 37 mm, drei nebeneinander und acht untereinander – das sind
 * genau 24 auf einem A4-Bogen und passt auf die ueblichen Universaletiketten.
 *
 * Der QR-Code fuehrt zur Portion in der App. Damit er auch vom Handy des
 * anderen Elternteils funktioniert, braucht er eine absolute Adresse; ohne
 * gesetzte APP_URL bleibt der Code weg, statt ins Leere zu zeigen.
 */
export const ETIKETT_BREITE_MM = 70
export const ETIKETT_HOEHE_MM = 37
export const ETIKETTEN_PRO_SPALTE = 3
export const ETIKETTEN_PRO_BOGEN = 24

export function portionPfad(id: string): string {
  return `/vorrat/${id}`
}

/**
 * QR-Code als SVG-Zeichenkette. Wird auf dem Server erzeugt und direkt in die
 * Seite geschrieben – kein Skript im Browser, kein externer Dienst.
 */
export async function qrSvg(id: string): Promise<string | null> {
  const url = absoluteUrl(portionPfad(id))
  if (!url) return null
  return QRCode.toString(url, {
    type: 'svg',
    margin: 0,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#ffffff' },
  })
}
