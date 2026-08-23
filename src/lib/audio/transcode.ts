import 'server-only'
import { spawn } from 'node:child_process'
import { mkdir, unlink, writeFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { UPLOAD_DIR } from '@/lib/media/storage'
import {
  MAX_DAUER_SEK,
  WELLENFORM_PUNKTE,
  ZIEL_BITRATE_KBPS,
  ZIEL_ENDUNG,
  ZIEL_MIME,
} from './notes'

/**
 * Aufnahmen landen als Opus im Ogg-Container: 64 kbit/s, mono. Drei Minuten
 * wiegen damit gut 1,4 MB – klein genug fuer Backup und Export, gut genug fuer
 * ein Lachen.
 *
 * Kodiert wird mit ffmpeg als eigenem Prozess. Das Original wird nach
 * erfolgreicher Umwandlung geloescht; schlaegt sie fehl, bleibt es liegen und
 * der Upload gilt als gescheitert – eine halbe Datei waere schlimmer als
 * keine.
 */
export const FFMPEG = process.env.FFMPEG_PATH ?? 'ffmpeg'
export const FFPROBE = process.env.FFPROBE_PATH ?? 'ffprobe'

export type TranscodeResult =
  | {
      ok: true
      path: string
      mimeType: string
      bytes: number
      durationSec: number
      peaks: number[]
    }
  | { ok: false; error: string }

function run(
  command: string,
  args: string[],
  opts: { erwarteAusgabe?: boolean } = {},
): Promise<{ code: number; stdout: Buffer; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    const stdout: Buffer[] = []
    let stderr = ''
    child.stdout.on('data', (chunk: Buffer) => {
      if (opts.erwarteAusgabe) stdout.push(chunk)
    })
    child.stderr.on('data', (chunk: Buffer) => {
      // Nur das Ende behalten – ffmpeg redet viel.
      stderr = (stderr + chunk.toString()).slice(-2000)
    })
    child.on('error', reject)
    child.on('close', (code) => resolve({ code: code ?? -1, stdout: Buffer.concat(stdout), stderr }))
  })
}

/** Ist ffmpeg ueberhaupt da? Ohne kann die Aufnahme gar nicht erst starten. */
export async function ffmpegVorhanden(): Promise<boolean> {
  try {
    const result = await run(FFMPEG, ['-hide_banner', '-version'])
    return result.code === 0
  } catch {
    return false
  }
}

async function dauerVon(datei: string): Promise<number | null> {
  try {
    const result = await run(
      FFPROBE,
      [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        datei,
      ],
      { erwarteAusgabe: true },
    )
    if (result.code !== 0) return null
    const sekunden = Number(result.stdout.toString().trim())
    return Number.isFinite(sekunden) ? sekunden : null
  } catch {
    return null
  }
}

/**
 * Wellenform: die Datei wird einmal als rohes PCM ausgelesen und zu
 * `WELLENFORM_PUNKTE` Ausschlaegen zwischen 0 und 1 zusammengefasst. Das
 * passiert einmal beim Hochladen – der Player zeichnet danach nur noch.
 */
async function wellenform(datei: string): Promise<number[]> {
  try {
    const result = await run(
      FFMPEG,
      [
        '-v', 'error',
        '-i', datei,
        '-ac', '1',
        '-ar', '8000',
        '-f', 's16le',
        '-',
      ],
      { erwarteAusgabe: true },
    )
    if (result.code !== 0 || result.stdout.byteLength < 2) return []

    const samples = new Int16Array(
      result.stdout.buffer,
      result.stdout.byteOffset,
      Math.floor(result.stdout.byteLength / 2),
    )
    const proPunkt = Math.max(1, Math.floor(samples.length / WELLENFORM_PUNKTE))
    const peaks: number[] = []
    for (let i = 0; i < WELLENFORM_PUNKTE; i += 1) {
      let max = 0
      const von = i * proPunkt
      for (let j = von; j < von + proPunkt && j < samples.length; j += 1) {
        const wert = Math.abs(samples[j] ?? 0)
        if (wert > max) max = wert
      }
      peaks.push(Math.round((max / 32768) * 100) / 100)
    }
    return peaks
  } catch {
    return []
  }
}

/**
 * Wandelt eine hochgeladene oder aufgenommene Datei nach Opus um und legt sie
 * unter `audio/<childId>/` ab.
 */
export async function transcodeToOpus(
  file: File,
  childId: string,
): Promise<TranscodeResult> {
  if (file.size === 0) return { ok: false, error: 'Die Aufnahme ist leer.' }

  const ordner = path.join(UPLOAD_DIR, 'audio', childId)
  await mkdir(ordner, { recursive: true })

  const basis = `${Date.now()}-${randomBytes(6).toString('hex')}`
  const original = path.join(ordner, `${basis}.original`)
  const ziel = path.join(ordner, `${basis}.${ZIEL_ENDUNG}`)

  await writeFile(original, Buffer.from(await file.arrayBuffer()))

  try {
    const dauer = await dauerVon(original)
    if (dauer === null) {
      return { ok: false, error: 'Das ist keine lesbare Audiodatei.' }
    }
    if (dauer > MAX_DAUER_SEK + 1) {
      return {
        ok: false,
        error: `Aufnahmen dürfen höchstens ${Math.round(MAX_DAUER_SEK / 60)} Minuten lang sein.`,
      }
    }

    const umgewandelt = await run(FFMPEG, [
      '-v', 'error',
      '-y',
      '-i', original,
      '-vn',
      '-map_metadata', '-1',
      '-ac', '1',
      '-c:a', 'libopus',
      '-b:a', `${ZIEL_BITRATE_KBPS}k`,
      ziel,
    ])
    if (umgewandelt.code !== 0) {
      await unlink(ziel).catch(() => {})
      return { ok: false, error: 'Die Aufnahme ließ sich nicht umwandeln.' }
    }

    const peaks = await wellenform(ziel)
    const groesse = await stat(ziel)

    // Erst jetzt, wenn wirklich alles steht, verschwindet das Original.
    await unlink(original).catch(() => {})

    return {
      ok: true,
      path: path.join('audio', childId, `${basis}.${ZIEL_ENDUNG}`),
      mimeType: ZIEL_MIME,
      bytes: groesse.size,
      durationSec: Math.round(dauer),
      peaks,
    }
  } catch (error) {
    await unlink(original).catch(() => {})
    await unlink(ziel).catch(() => {})
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Die Aufnahme ließ sich nicht verarbeiten.',
    }
  }
}
