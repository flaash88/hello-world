'use client'
import { createSound, SOUNDS, type ActiveSound, type SoundId } from './generators'

/**
 * Der Player kapselt den AudioContext und alles, was daran hängt.
 *
 * Wichtig fürs Handy: Der Context darf erst nach einer Nutzergeste gestartet
 * werden, und beim Timer-Ende wird sanft ausgeblendet statt hart gestoppt –
 * ein abrupter Abbruch weckt zuverlässiger als jedes Geräusch.
 */
export class SoundPlayer {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private active: ActiveSound | null = null
  private fadeTimer: ReturnType<typeof setTimeout> | null = null
  private endTimer: ReturnType<typeof setTimeout> | null = null

  currentId: SoundId | null = null
  volume = 0.6

  private ensureContext(): AudioContext {
    if (!this.context) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.context = new Ctor()
      this.master = this.context.createGain()
      this.master.gain.value = this.volume
      this.master.connect(this.context.destination)
    }
    return this.context
  }

  /** Startet einen Klang. `fadeOutAfterSec` blendet danach sanft aus. */
  async play(id: SoundId, options: { fadeOutAfterSec?: number | null } = {}): Promise<void> {
    const context = this.ensureContext()
    if (context.state === 'suspended') await context.resume()

    this.stopInternal()

    const sound = createSound(context, id)
    sound.output.connect(this.master!)
    this.active = sound
    this.currentId = id

    // Kurz einblenden, damit der Start nicht knackt.
    this.master!.gain.cancelScheduledValues(context.currentTime)
    this.master!.gain.setValueAtTime(0.0001, context.currentTime)
    this.master!.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, this.volume),
      context.currentTime + 0.8,
    )

    this.clearTimers()
    if (options.fadeOutAfterSec && options.fadeOutAfterSec > 0) {
      const fadeSec = Math.min(60, Math.max(10, options.fadeOutAfterSec * 0.1))
      const startFadeMs = Math.max(0, (options.fadeOutAfterSec - fadeSec) * 1000)
      this.fadeTimer = setTimeout(() => this.fadeOut(fadeSec), startFadeMs)
      this.endTimer = setTimeout(() => this.stop(), options.fadeOutAfterSec * 1000 + 500)
    }
  }

  private fadeOut(seconds: number): void {
    if (!this.context || !this.master) return
    const now = this.context.currentTime
    this.master.gain.cancelScheduledValues(now)
    this.master.gain.setValueAtTime(Math.max(0.0001, this.master.gain.value), now)
    this.master.gain.exponentialRampToValueAtTime(0.0001, now + seconds)
  }

  setVolume(value: number): void {
    this.volume = Math.min(1, Math.max(0, value))
    if (this.master && this.context) {
      this.master.gain.cancelScheduledValues(this.context.currentTime)
      this.master.gain.setTargetAtTime(Math.max(0.0001, this.volume), this.context.currentTime, 0.05)
    }
  }

  private clearTimers(): void {
    if (this.fadeTimer) clearTimeout(this.fadeTimer)
    if (this.endTimer) clearTimeout(this.endTimer)
    this.fadeTimer = null
    this.endTimer = null
  }

  private stopInternal(): void {
    this.active?.stop()
    this.active = null
  }

  stop(): void {
    this.clearTimers()
    this.stopInternal()
    this.currentId = null
  }

  get isPlaying(): boolean {
    return this.active !== null
  }

  async dispose(): Promise<void> {
    this.stop()
    if (this.context) {
      await this.context.close()
      this.context = null
      this.master = null
    }
  }
}

/**
 * Meldet den laufenden Klang an die MediaSession. Dadurch bleibt die Wiedergabe
 * auf dem Sperrbildschirm sichtbar und steuerbar – und iOS hält den Ton bei
 * gesperrtem Display eher am Leben.
 */
export function updateMediaSession(id: SoundId | null, onStop: () => void): void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return

  if (!id) {
    navigator.mediaSession.playbackState = 'none'
    navigator.mediaSession.metadata = null
    return
  }

  const sound = SOUNDS.find((entry) => entry.id === id)
  navigator.mediaSession.metadata = new MediaMetadata({
    title: sound?.label ?? 'Einschlafgeräusch',
    artist: 'Sprössling',
    artwork: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
  })
  navigator.mediaSession.playbackState = 'playing'
  navigator.mediaSession.setActionHandler('pause', onStop)
  navigator.mediaSession.setActionHandler('stop', onStop)
}
