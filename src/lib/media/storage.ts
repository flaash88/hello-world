import 'server-only'
import { mkdir, readFile, rm, unlink, writeFile } from 'node:fs/promises'
import { createHash, randomBytes } from 'node:crypto'
import path from 'node:path'
import sharp from 'sharp'
import { AUDIO_MIME, MAX_AUDIO_BYTES, detectAudioFormat, safeSoundName } from './audio'

/**
 * Bildablage auf der lokalen Platte.
 *
 * Alle Bilder werden neu kodiert, statt die Originaldatei zu übernehmen: Das
 * entfernt sämtliche EXIF-Daten (inklusive GPS-Koordinaten) und schützt davor,
 * dass eine als Bild getarnte Datei ausgeliefert wird. Das Aufnahmedatum wird
 * vorher ausgelesen und getrennt zurückgegeben, damit es als Vorschlag dienen
 * kann.
 */

export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './data/uploads'
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024
export const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

/** Längste Kante des gespeicherten Bildes. */
const MAX_EDGE = 2048
const THUMB_EDGE = 480

export type StoredImage = {
  path: string
  thumbPath: string
  width: number
  height: number
  bytes: number
  mimeType: string
  /** Aufnahmezeitpunkt aus den EXIF-Daten, falls vorhanden. */
  takenAt: Date | null
}

function monthDir(now: Date): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

/** Liest das Aufnahmedatum aus den EXIF-Daten, bevor sie verworfen werden. */
async function readTakenAt(buffer: Buffer): Promise<Date | null> {
  try {
    const metadata = await sharp(buffer).metadata()
    const exif = metadata.exif
    if (!exif) return null

    // EXIF-Datumsfelder haben das Format "YYYY:MM:DD HH:MM:SS".
    const text = exif.toString('latin1')
    const match = /(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(text)
    if (!match) return null

    const [, year, month, day, hour, minute, second] = match
    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    )
    if (Number.isNaN(date.getTime())) return null
    // Offensichtlich falsche Kameradaten aussortieren.
    if (date.getFullYear() < 1990 || date.getTime() > Date.now() + 86400000) return null
    return date
  } catch {
    return null
  }
}

export type StoreResult = { ok: true; image: StoredImage } | { ok: false; error: string }

export async function storeImage(file: File, childId: string): Promise<StoreResult> {
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: 'Das Bild ist größer als 20 MB.' }
  }
  if (file.size === 0) {
    return { ok: false, error: 'Die Datei ist leer.' }
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // Der Dateityp wird aus dem Inhalt bestimmt, nicht aus dem gemeldeten
  // MIME-Type oder der Endung – beides ist frei wählbar.
  let metadata: sharp.Metadata
  try {
    metadata = await sharp(buffer).metadata()
  } catch {
    return { ok: false, error: 'Das ist kein lesbares Bild.' }
  }
  if (!metadata.format || !['jpeg', 'png', 'webp', 'heif', 'avif', 'gif'].includes(metadata.format)) {
    return { ok: false, error: 'Dieses Bildformat wird nicht unterstützt.' }
  }

  const takenAt = await readTakenAt(buffer)

  const folder = path.join(UPLOAD_DIR, childId, monthDir(new Date()))
  await mkdir(folder, { recursive: true })

  const name = `${Date.now()}-${randomBytes(6).toString('hex')}`
  const fullName = `${name}.webp`
  const thumbName = `${name}-thumb.webp`

  // Neu kodieren statt kopieren: EXIF ist danach weg, das Format garantiert.
  const pipeline = sharp(buffer).rotate().resize({
    width: MAX_EDGE,
    height: MAX_EDGE,
    fit: 'inside',
    withoutEnlargement: true,
  })
  const full = await pipeline.webp({ quality: 82 }).toBuffer({ resolveWithObject: true })
  const thumb = await sharp(buffer)
    .rotate()
    .resize({ width: THUMB_EDGE, height: THUMB_EDGE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 70 })
    .toBuffer()

  await writeFile(path.join(folder, fullName), full.data)
  await writeFile(path.join(folder, thumbName), thumb)

  const relative = path.join(childId, monthDir(new Date()))
  return {
    ok: true,
    image: {
      path: path.join(relative, fullName),
      thumbPath: path.join(relative, thumbName),
      width: full.info.width,
      height: full.info.height,
      bytes: full.info.size,
      mimeType: 'image/webp',
      takenAt,
    },
  }
}

export type StoredSound = {
  path: string
  mimeType: string
  bytes: number
  name: string
}

export type StoreSoundResult = { ok: true; sound: StoredSound } | { ok: false; error: string }

/**
 * Legt eine hochgeladene Audiodatei ab. Sie wird nicht neu kodiert – dafuer
 * braeuchte es einen Decoder im Image –, deshalb entscheidet der Container
 * ueber Typ und Auslieferung. Enthaltene Tags (z. B. ID3) bleiben erhalten;
 * die Datei liegt wie die Fotos hinter der Anmeldung, nicht in `public`.
 */
export async function storeSound(file: File, householdId: string): Promise<StoreSoundResult> {
  if (file.size === 0) return { ok: false, error: 'Die Datei ist leer.' }
  if (file.size > MAX_AUDIO_BYTES) {
    return { ok: false, error: `Die Datei ist größer als ${Math.round(MAX_AUDIO_BYTES / 1024 / 1024)} MB.` }
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const format = detectAudioFormat(new Uint8Array(buffer.subarray(0, 16)))
  if (!format) {
    return { ok: false, error: 'Das ist keine unterstützte Audiodatei (MP3, OGG, WAV, M4A, FLAC).' }
  }

  const folder = path.join(UPLOAD_DIR, 'sounds', householdId)
  await mkdir(folder, { recursive: true })
  const fileName = `${Date.now()}-${randomBytes(6).toString('hex')}.${format}`
  await writeFile(path.join(folder, fileName), buffer)

  return {
    ok: true,
    sound: {
      path: path.join('sounds', householdId, fileName),
      mimeType: AUDIO_MIME[format],
      bytes: buffer.byteLength,
      name: safeSoundName(file.name),
    },
  }
}

/** Liest eine gespeicherte Datei. Verhindert das Ausbrechen aus UPLOAD_DIR. */
export async function readStoredFile(relativePath: string): Promise<Buffer | null> {
  const root = path.resolve(UPLOAD_DIR)
  const target = path.resolve(root, relativePath)
  if (!target.startsWith(root + path.sep)) return null
  try {
    return await readFile(target)
  } catch {
    return null
  }
}

export async function deleteStoredFile(relativePath: string): Promise<void> {
  const root = path.resolve(UPLOAD_DIR)
  const target = path.resolve(root, relativePath)
  if (!target.startsWith(root + path.sep)) return
  try {
    await unlink(target)
  } catch {
    // Bereits gelöscht – kein Grund für einen Fehler.
  }
}

/**
 * Entfernt alle Bilder eines Kindes. Wird nur beim vollstaendigen Loeschen
 * gebraucht – Einzelbilder gehen ueber deleteStoredFile.
 */
export async function deleteChildUploads(childId: string): Promise<void> {
  const root = path.resolve(UPLOAD_DIR)
  const target = path.resolve(root, childId)
  if (!target.startsWith(root + path.sep)) return
  try {
    await rm(target, { recursive: true, force: true })
  } catch {
    // Verzeichnis gab es nie oder ist schon weg.
  }
}

/** Entfernt die eigenen Klänge eines Haushalts (nur beim Loeschen des Haushalts). */
export async function deleteHouseholdSounds(householdId: string): Promise<void> {
  const root = path.resolve(UPLOAD_DIR)
  const target = path.resolve(root, 'sounds', householdId)
  if (!target.startsWith(root + path.sep)) return
  try {
    await rm(target, { recursive: true, force: true })
  } catch {
    // Verzeichnis gab es nie oder ist schon weg.
  }
}

/** Stabiler ETag für das Caching der Bilder. */
export function etagFor(relativePath: string, bytes: number): string {
  return `"${createHash('sha1').update(`${relativePath}:${bytes}`).digest('hex').slice(0, 16)}"`
}
