/**
 * Einschlafgeräusche, erzeugt per Web Audio API.
 *
 * Statt Audiodateien auszuliefern, wird das Rauschen im Browser synthetisiert:
 * kein Download, keine Lizenzfragen, keine Endlosschleife mit hörbarem Schnitt
 * und beliebig lange Laufzeit bei wenigen Kilobyte Code.
 *
 * Grundlage ist weißes Rauschen, das durch Filter in die jeweilige Klangfarbe
 * gebracht wird:
 * - Weiß:  gleiche Energie je Frequenz (hell, zischend)
 * - Rosa:  Energie fällt mit 3 dB pro Oktave (ausgewogen)
 * - Braun: Energie fällt mit 6 dB pro Oktave (tief, wie fernes Rauschen)
 */

export const SOUND_IDS = [
  'white',
  'pink',
  'brown',
  'rain',
  'forest',
  'heartbeat',
  'womb',
  'hairdryer',
  'ocean',
] as const
export type SoundId = (typeof SOUND_IDS)[number]

export type SoundDefinition = {
  id: SoundId
  label: string
  description: string
}

export const SOUNDS: SoundDefinition[] = [
  { id: 'white', label: 'Weißes Rauschen', description: 'Hell und gleichmäßig, überdeckt Umgebungsgeräusche am stärksten.' },
  { id: 'pink', label: 'Rosa Rauschen', description: 'Ausgewogener als weißes Rauschen, für viele angenehmer.' },
  { id: 'brown', label: 'Braunes Rauschen', description: 'Tief und dumpf, ähnelt fernem Wasserrauschen.' },
  { id: 'rain', label: 'Regen', description: 'Gefiltertes Rauschen mit unregelmäßigen Tropfen.' },
  { id: 'forest', label: 'Wald', description: 'Leises Blätterrauschen mit langsamem An- und Abschwellen.' },
  { id: 'heartbeat', label: 'Herzschlag', description: 'Ruhiger Doppelschlag mit etwa 70 Schlägen pro Minute.' },
  { id: 'womb', label: 'Mutterleib', description: 'Dumpfes Rauschen mit überlagertem Herzschlag.' },
  { id: 'hairdryer', label: 'Fön', description: 'Konstantes Motorrauschen mit leichtem Klangkörper.' },
  { id: 'ocean', label: 'Meer', description: 'Wellen, die alle paar Sekunden an- und abschwellen.' },
]

/** Ein laufender Klang mit allem, was zum Aufräumen nötig ist. */
export type ActiveSound = {
  stop: () => void
  /** Ausgangsknoten, an dem die Lautstärke geregelt wird. */
  output: GainNode
}

/** Erzeugt einen Puffer mit weißem Rauschen. */
function whiteNoiseBuffer(context: AudioContext, seconds = 4): AudioBuffer {
  const length = Math.floor(context.sampleRate * seconds)
  const buffer = context.createBuffer(1, length, context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
  return buffer
}

/**
 * Rosa Rauschen nach dem Verfahren von Paul Kellet: eine Kaskade von
 * Tiefpassfiltern über weißes Rauschen ergibt sehr genau den 1/f-Verlauf.
 */
function pinkNoiseBuffer(context: AudioContext, seconds = 4): AudioBuffer {
  const length = Math.floor(context.sampleRate * seconds)
  const buffer = context.createBuffer(1, length, context.sampleRate)
  const data = buffer.getChannelData(0)

  let b0 = 0
  let b1 = 0
  let b2 = 0
  let b3 = 0
  let b4 = 0
  let b5 = 0
  let b6 = 0

  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + white * 0.0555179
    b1 = 0.99332 * b1 + white * 0.0750759
    b2 = 0.969 * b2 + white * 0.153852
    b3 = 0.8665 * b3 + white * 0.3104856
    b4 = 0.55 * b4 + white * 0.5329522
    b5 = -0.7616 * b5 - white * 0.016898
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
    b6 = white * 0.115926
  }
  return buffer
}

/** Braunes Rauschen: integriertes weißes Rauschen (6 dB pro Oktave Abfall). */
function brownNoiseBuffer(context: AudioContext, seconds = 4): AudioBuffer {
  const length = Math.floor(context.sampleRate * seconds)
  const buffer = context.createBuffer(1, length, context.sampleRate)
  const data = buffer.getChannelData(0)

  let last = 0
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    data[i] = last * 3.5
  }
  return buffer
}

function loopSource(context: AudioContext, buffer: AudioBuffer): AudioBufferSourceNode {
  const source = context.createBufferSource()
  source.buffer = buffer
  source.loop = true
  source.start()
  return source
}

/** Langsame, unregelmäßige Modulation – lässt Dauerrauschen lebendig wirken. */
function slowModulation(
  context: AudioContext,
  target: AudioParam,
  depth: number,
  periodSec: number,
): OscillatorNode {
  const lfo = context.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = 1 / periodSec
  const gain = context.createGain()
  gain.gain.value = depth
  lfo.connect(gain).connect(target)
  lfo.start()
  return lfo
}

/**
 * Baut den gewünschten Klang auf und gibt eine Stopp-Funktion zurück.
 * Der Aufrufer verbindet `output` mit dem Ziel (üblicherweise der
 * Master-Lautstärke).
 */
export function createSound(context: AudioContext, id: SoundId): ActiveSound {
  const output = context.createGain()
  output.gain.value = 1
  const cleanup: (() => void)[] = []

  const track = <T extends AudioScheduledSourceNode>(node: T): T => {
    cleanup.push(() => {
      try {
        node.stop()
      } catch {
        // Bereits gestoppt.
      }
      node.disconnect()
    })
    return node
  }

  switch (id) {
    case 'white': {
      track(loopSource(context, whiteNoiseBuffer(context))).connect(output)
      break
    }
    case 'pink': {
      track(loopSource(context, pinkNoiseBuffer(context))).connect(output)
      break
    }
    case 'brown': {
      track(loopSource(context, brownNoiseBuffer(context))).connect(output)
      break
    }
    case 'rain': {
      // Rosa Rauschen mit angehobenen Höhen klingt nach Regen auf Blättern.
      const source = track(loopSource(context, pinkNoiseBuffer(context)))
      const highpass = context.createBiquadFilter()
      highpass.type = 'highpass'
      highpass.frequency.value = 500
      const peak = context.createBiquadFilter()
      peak.type = 'peaking'
      peak.frequency.value = 3200
      peak.gain.value = 6
      peak.Q.value = 0.8
      source.connect(highpass).connect(peak).connect(output)
      cleanup.push(() => slowModulation(context, peak.gain, 2, 11).stop())
      break
    }
    case 'forest': {
      const source = track(loopSource(context, pinkNoiseBuffer(context)))
      const bandpass = context.createBiquadFilter()
      bandpass.type = 'bandpass'
      bandpass.frequency.value = 1400
      bandpass.Q.value = 0.5
      const swell = context.createGain()
      swell.gain.value = 0.75
      source.connect(bandpass).connect(swell).connect(output)
      // Langsames An- und Abschwellen wie Wind in Blättern.
      const lfo = track(slowModulation(context, swell.gain, 0.22, 9))
      void lfo
      break
    }
    case 'heartbeat': {
      const beat = createHeartbeat(context)
      beat.connect(output)
      cleanup.push(() => beat.stop())
      break
    }
    case 'womb': {
      // Dumpfes Rauschen plus Herzschlag – so klingt es von innen ungefähr.
      const source = track(loopSource(context, brownNoiseBuffer(context)))
      const lowpass = context.createBiquadFilter()
      lowpass.type = 'lowpass'
      lowpass.frequency.value = 420
      const noiseGain = context.createGain()
      noiseGain.gain.value = 0.9
      source.connect(lowpass).connect(noiseGain).connect(output)

      const beat = createHeartbeat(context, { bpm: 75, level: 0.35 })
      beat.connect(output)
      cleanup.push(() => beat.stop())
      break
    }
    case 'hairdryer': {
      const source = track(loopSource(context, whiteNoiseBuffer(context)))
      const lowpass = context.createBiquadFilter()
      lowpass.type = 'lowpass'
      lowpass.frequency.value = 2600
      // Ein schmaler Resonanzpeak gibt dem Rauschen den Motorcharakter.
      const resonance = context.createBiquadFilter()
      resonance.type = 'peaking'
      resonance.frequency.value = 260
      resonance.Q.value = 4
      resonance.gain.value = 9
      source.connect(lowpass).connect(resonance).connect(output)
      break
    }
    case 'ocean': {
      const source = track(loopSource(context, brownNoiseBuffer(context)))
      const lowpass = context.createBiquadFilter()
      lowpass.type = 'lowpass'
      lowpass.frequency.value = 900
      const wave = context.createGain()
      wave.gain.value = 0.55
      source.connect(lowpass).connect(wave).connect(output)
      // Wellen alle sieben Sekunden, dazu eine langsamere Überlagerung.
      track(slowModulation(context, wave.gain, 0.4, 7))
      track(slowModulation(context, lowpass.frequency, 350, 13))
      break
    }
  }

  return {
    output,
    stop: () => {
      for (const fn of cleanup) fn()
      output.disconnect()
    },
  }
}

/** Rhythmischer Doppelschlag aus zwei kurzen tiefen Impulsen. */
function createHeartbeat(
  context: AudioContext,
  options: { bpm?: number; level?: number } = {},
): { connect: (destination: AudioNode) => void; stop: () => void } {
  const bpm = options.bpm ?? 70
  const level = options.level ?? 0.6
  const output = context.createGain()
  output.gain.value = level

  let stopped = false
  let timer: ReturnType<typeof setTimeout> | undefined

  const thump = (at: number, gain: number) => {
    const osc = context.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(62, at)
    osc.frequency.exponentialRampToValueAtTime(28, at + 0.12)

    const envelope = context.createGain()
    envelope.gain.setValueAtTime(0.0001, at)
    envelope.gain.exponentialRampToValueAtTime(gain, at + 0.02)
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + 0.22)

    osc.connect(envelope).connect(output)
    osc.start(at)
    osc.stop(at + 0.3)
  }

  const intervalSec = 60 / bpm
  const schedule = () => {
    if (stopped) return
    const now = context.currentTime
    thump(now + 0.02, 0.9)
    // Der zweite Ton kommt kurz nach dem ersten und ist leiser.
    thump(now + 0.02 + intervalSec * 0.3, 0.55)
    timer = setTimeout(schedule, intervalSec * 1000)
  }
  schedule()

  return {
    connect: (destination: AudioNode) => output.connect(destination),
    stop: () => {
      stopped = true
      if (timer) clearTimeout(timer)
      output.disconnect()
    },
  }
}
