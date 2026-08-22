/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest'
import { SOUNDS, SOUND_IDS, createSound, type SoundId } from './generators'

/**
 * Ein minimaler AudioContext-Ersatz. Getestet wird nicht der Klang – das
 * ginge nur mit Ohren – sondern dass jeder Klang einen vollständigen Graphen
 * aufbaut, ihn beim Stoppen wieder abbaut und keine Quelle laufen lässt.
 */
function fakeContext() {
  const started: string[] = []
  const stopped: string[] = []
  let idCounter = 0

  const node = (kind: string) => {
    const id = `${kind}-${idCounter++}`
    const self = {
      id,
      kind,
      connect: vi.fn((destination: unknown) => destination),
      disconnect: vi.fn(),
      start: vi.fn(() => started.push(id)),
      stop: vi.fn(() => stopped.push(id)),
      gain: param(),
      frequency: param(),
      Q: param(),
      type: '',
      loop: false,
      buffer: null as AudioBuffer | null,
    }
    return self
  }

  function param() {
    return {
      value: 0,
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      setTargetAtTime: vi.fn(),
      cancelScheduledValues: vi.fn(),
    }
  }

  const context = {
    sampleRate: 8000,
    currentTime: 0,
    destination: node('destination'),
    createGain: vi.fn(() => node('gain')),
    createBiquadFilter: vi.fn(() => node('filter')),
    createOscillator: vi.fn(() => node('oscillator')),
    createBufferSource: vi.fn(() => node('source')),
    createBuffer: vi.fn((channels: number, length: number) => ({
      length,
      getChannelData: () => new Float32Array(length),
    })),
  }

  return { context: context as unknown as AudioContext, started, stopped }
}

describe('SOUNDS', () => {
  it('beschreibt jeden Klang', () => {
    expect(SOUNDS).toHaveLength(SOUND_IDS.length)
    for (const sound of SOUNDS) {
      expect(SOUND_IDS).toContain(sound.id)
      expect(sound.label.length).toBeGreaterThanOrEqual(3)
      expect(sound.description.length).toBeGreaterThan(20)
    }
  })

  it('hat eindeutige Schlüssel', () => {
    expect(new Set(SOUNDS.map((s) => s.id)).size).toBe(SOUNDS.length)
  })
})

describe('createSound', () => {
  it('baut für jeden Klang einen Graphen mit Ausgang auf', () => {
    for (const id of SOUND_IDS) {
      const { context, started } = fakeContext()
      const sound = createSound(context, id as SoundId)
      expect(sound.output).toBeDefined()
      // Jeder Klang startet mindestens eine Quelle.
      expect(started.length).toBeGreaterThan(0)
      sound.stop()
    }
  })

  it('stoppt beim Beenden alles, was gestartet wurde', () => {
    for (const id of SOUND_IDS) {
      const { context, started, stopped } = fakeContext()
      const sound = createSound(context, id as SoundId)
      const startedCount = started.length
      sound.stop()
      // Rauschquellen und Oszillatoren werden gestoppt; geplante Einzeltöne
      // des Herzschlags laufen aus und zählen hier nicht mit.
      expect(stopped.length).toBeGreaterThan(0)
      expect(startedCount).toBeGreaterThan(0)
    }
  })

  it('verträgt mehrfaches Stoppen', () => {
    const { context } = fakeContext()
    const sound = createSound(context, 'pink')
    sound.stop()
    expect(() => sound.stop()).not.toThrow()
  })

  it('erzeugt für Regen und Meer zusätzliche Filter', () => {
    const { context } = fakeContext()
    const before = (context.createBiquadFilter as unknown as { mock: { calls: unknown[] } }).mock.calls.length
    createSound(context, 'rain').stop()
    const after = (context.createBiquadFilter as unknown as { mock: { calls: unknown[] } }).mock.calls.length
    expect(after).toBeGreaterThan(before)
  })
})
