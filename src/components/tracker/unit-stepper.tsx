'use client'
import { NumberStepper } from './number-stepper'
import { useUnits } from '@/components/units-provider'
import { fromDisplay, roundedDisplay, toDisplay, unitLabel, unitStep, type UnitKind } from '@/lib/units'

/**
 * Zahleneingabe in der eingestellten Einheit. Nach aussen bleibt der Wert
 * metrisch – umgerechnet wird nur, was auf dem Bildschirm steht.
 */
export function UnitStepper({
  kind,
  id,
  label,
  value,
  onChange,
  min = 0,
  max,
  placeholder,
}: {
  kind: UnitKind
  id: string
  label: string
  value: number | null
  onChange: (value: number | null) => void
  /** Grenzen in metrischen Einheiten. */
  min?: number
  max: number
  placeholder?: string
}) {
  const units = useUnits()
  return (
    <NumberStepper
      id={id}
      label={label}
      unit={unitLabel(kind, units)}
      step={unitStep(kind, units)}
      min={roundedDisplay(kind, min, units)}
      max={Math.ceil(toDisplay(kind, max, units))}
      placeholder={placeholder}
      value={value === null ? null : roundedDisplay(kind, value, units)}
      onChange={(next) => onChange(next === null ? null : fromDisplay(kind, next, units))}
    />
  )
}
