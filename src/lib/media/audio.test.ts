import { describe, expect, it } from 'vitest'
import { AUDIO_MIME, detectAudioFormat, safeSoundName } from './audio'

function bytes(...parts: (string | number[])[]): Uint8Array {
  const out: number[] = []
  for (const part of parts) {
    if (typeof part === 'string') {
      for (const char of part) out.push(char.charCodeAt(0))
    } else {
      out.push(...part)
    }
  }
  // Auf mindestens zwölf Bytes auffüllen – kürzer wird nie akzeptiert.
  while (out.length < 12) out.push(0)
  return new Uint8Array(out)
}

describe('detectAudioFormat', () => {
  it('erkennt MP3 am ID3-Tag und am Frame-Sync', () => {
    expect(detectAudioFormat(bytes('ID3', [3, 0, 0]))).toBe('mp3')
    expect(detectAudioFormat(bytes([0xff, 0xfb, 0x90, 0x00]))).toBe('mp3')
  })

  it('erkennt Ogg, FLAC, WAV und M4A', () => {
    expect(detectAudioFormat(bytes('OggS'))).toBe('ogg')
    expect(detectAudioFormat(bytes('fLaC'))).toBe('flac')
    expect(detectAudioFormat(bytes('RIFF', [0, 0, 0, 0], 'WAVE'))).toBe('wav')
    expect(detectAudioFormat(bytes([0, 0, 0, 0x20], 'ftypM4A '))).toBe('m4a')
  })

  it('lehnt alles andere ab', () => {
    expect(detectAudioFormat(bytes('Das ist ein Text'))).toBeNull()
    expect(detectAudioFormat(bytes('RIFF', [0, 0, 0, 0], 'AVI '))).toBeNull()
    expect(detectAudioFormat(new Uint8Array([1, 2, 3]))).toBeNull()
  })

  it('hat fuer jedes Format einen MIME-Type', () => {
    for (const format of ['mp3', 'ogg', 'wav', 'm4a', 'flac'] as const) {
      expect(AUDIO_MIME[format]).toMatch(/^audio\//)
    }
  })
})

describe('safeSoundName', () => {
  it('entfernt die Endung und kuerzt', () => {
    expect(safeSoundName('Regen auf dem Dach.mp3')).toBe('Regen auf dem Dach')
    expect(safeSoundName('  ')).toBe('Eigener Klang')
    expect(safeSoundName('x'.repeat(200)).length).toBe(60)
  })
})
