/**
 * Absolute Links fuer Wege, die den Browser der App nicht kennen.
 *
 * Web Push loest relative Pfade selbst gegen die Origin des Service Workers
 * auf – der ntfy-Client nicht: Dessen "Click"-Aktion braucht eine vollstaendige
 * URL. Dafuer gibt es `APP_URL` (die oeffentliche Adresse hinter dem Tunnel).
 * Ohne gesetzte `APP_URL` gibt es lieber keinen Link als einen kaputten.
 */
export function absoluteUrl(pathOrUrl: string | undefined, base = process.env.APP_URL): string | null {
  if (!pathOrUrl) return null
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  if (!base) return null
  try {
    return new URL(pathOrUrl, base.endsWith('/') ? base : `${base}/`).toString()
  } catch {
    return null
  }
}
