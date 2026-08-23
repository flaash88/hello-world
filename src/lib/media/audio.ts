/**
 * Erkennung von Audioformaten anhand der ersten Bytes.
 *
 * Anders als bei Bildern wird eine hochgeladene Audiodatei nicht neu kodiert –
 * dafuer braeuchte es einen Decoder im Image. Stattdessen wird das Format am
 * Container erkannt (die Endung und der gemeldete MIME-Type sind frei
 * waehlbar), und ausgeliefert wird nur mit dem hier bestimmten Typ.
 */
export const AUDIO_FORMATS = ['mp3', 'ogg', 'wav', 'm4a', 'flac'] as const
export type AudioFormat = (typeof AUDIO_FORMATS)[number]

export const AUDIO_MIME: Record<AudioFormat, string> = {
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  flac: 'audio/flac',
}

export const MAX_AUDIO_BYTES = 25 * 1024 * 1024

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  let out = ''
  for (let i = offset; i < offset + length && i < bytes.length; i += 1) {
    out += String.fromCharCode(bytes[i] ?? 0)
  }
  return out
}

/** Liefert das erkannte Format oder null, wenn es keines der erlaubten ist. */
export function detectAudioFormat(bytes: Uint8Array): AudioFormat | null {
  if (bytes.length < 12) return null

  // ID3-Tag oder MPEG-Frame-Sync (0xFF 0xEx/0xFx).
  if (ascii(bytes, 0, 3) === 'ID3') return 'mp3'
  const first = bytes[0] ?? 0
  const second = bytes[1] ?? 0
  if (first === 0xff && (second & 0xe0) === 0xe0) return 'mp3'

  if (ascii(bytes, 0, 4) === 'OggS') return 'ogg'
  if (ascii(bytes, 0, 4) === 'fLaC') return 'flac'
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WAVE') return 'wav'
  // MP4/M4A: Groessenfeld, dann "ftyp".
  if (ascii(bytes, 4, 4) === 'ftyp') return 'm4a'

  return null
}

/** Dateiname fuer die Ablage: nur Kleinbuchstaben, Ziffern und Bindestriche. */
export function safeSoundName(name: string): string {
  const trimmed = name.trim().replace(/\.[a-z0-9]{1,5}$/i, '')
  return trimmed.length > 0 ? trimmed.slice(0, 60) : 'Eigener Klang'
}
