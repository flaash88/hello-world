import type { SleepForecast, SleepPressure, WakeWindowModel } from './adaptive'
import { formatDuration, formatTime } from '@/lib/time'

/**
 * Wie die App über Vorhersagen spricht.
 *
 * Regel: beschreiben, nicht anweisen. Die App weiß, was zuletzt war; sie weiß
 * nicht, was jetzt zu tun ist. Deshalb:
 *
 * - „Ungefähr ab 13:40 könnte Müdigkeit kommen", nicht „Nächster Schlaf: 13:40"
 * - „Zuletzt lagen dazwischen etwa 1 h 45", nicht „Wachfenster: 1:45"
 * - kein Imperativ, kein „jetzt", kein Countdown auf eine Handlung
 * - keine Prozentzahl auf eine Vermutung
 *
 * Der Satz in `FORECAST_HINWEIS` steht fest auf jeder Ansicht mit Vorhersage
 * und lässt sich nicht wegklicken.
 */

export const FORECAST_HINWEIS =
  'Das ist aus euren bisherigen Einträgen gerechnet. Euer Kind kennt seinen Rhythmus besser als die App.'

/**
 * Der Schlafdruck als Beobachtung. Bewusst ohne Ampel und ohne Wertung:
 * „übermüdet" ist eine Diagnose, „lange wach" eine Feststellung.
 */
export function schlafdruckText(level: SleepPressure['level']): string {
  switch (level) {
    case 'fresh':
      return 'Gerade erst wach'
    case 'building':
      return 'Eine Weile wach'
    case 'ready':
      return 'So lange wie sonst vor dem Schlafen'
    case 'overtired':
      return 'Länger wach als sonst'
  }
}

/** Wie lange schon wach – als Feststellung, ohne Sollwert daneben. */
export function wachSeitText(pressure: SleepPressure): string {
  return `Wach seit ${formatDuration(pressure.awakeMin * 60)}`
}

/**
 * Das erwartete Fenster als Zeitpunkt, ab dem Müdigkeit kommen könnte.
 * Bewusst ein Konjunktiv und ein „ungefähr" – die Zahl ist genauer, als die
 * Sache es ist.
 */
export function muedigkeitText(forecast: SleepForecast, timezone: string): string {
  const von = formatTime(forecast.from, timezone)
  const bis = formatTime(forecast.to, timezone)
  if (forecast.kind === 'bedtime') {
    return `Zwischen ${von} und ${bis} ging es zuletzt in die Nacht`
  }
  if (forecast.due) {
    return `Etwa seit ${von} liegt die Zeit, in der zuletzt Müdigkeit kam`
  }
  return `Ungefähr ab ${von} könnte Müdigkeit kommen, meist bis ${bis}`
}

/** Das gemessene Wachfenster – als Rückblick, nicht als Vorgabe. */
export function wachfensterText(model: WakeWindowModel): string {
  if (model.sampleSize === 0) {
    return `Zwischen Aufwachen und Einschlafen liegen in diesem Alter oft etwa ${formatDuration(
      model.baselineMin * 60,
    )}.`
  }
  return `Zuletzt lagen zwischen Aufwachen und Einschlafen etwa ${formatDuration(
    model.lowerMin * 60,
  )} bis ${formatDuration(model.upperMin * 60)}.`
}

/**
 * Solange zu wenig eingetragen ist, sagt die App das – ohne Fortschrittszahl
 * und ohne Aufforderung, mehr einzutragen.
 */
export function kalibrierText(model: WakeWindowModel): string {
  return `Euren Rhythmus kennt die App noch nicht. Bei Kindern in diesem Alter liegen zwischen Aufwachen und Einschlafen oft etwa ${formatDuration(
    model.baselineMin * 60,
  )}.`
}
