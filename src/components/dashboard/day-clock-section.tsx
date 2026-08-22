'use client'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { DayClock, type PlannedWindow } from './day-clock'
import type { DaySegment } from '@/lib/dashboard/day-segments'
import { loadDaySegmentsAction } from '@/lib/actions/dashboard'

/**
 * Haelt die Kreisuhr mit den Daten des gewaehlten Tages. Vortage werden bei
 * Bedarf nachgeladen, damit die Startseite klein bleibt.
 */
export function DayClockSection({
  childId,
  initialSegments,
  initialPlanned,
  initialNowMinutes,
  initialLabel,
}: {
  childId: string
  initialSegments: DaySegment[]
  initialPlanned: PlannedWindow | null
  initialNowMinutes: number | null
  initialLabel: string
}) {
  const [offset, setOffset] = useState(0)
  const [segments, setSegments] = useState(initialSegments)
  const [planned, setPlanned] = useState(initialPlanned)
  const [nowMinutes, setNowMinutes] = useState(initialNowMinutes)
  const [label, setLabel] = useState(initialLabel)
  const [, startTransition] = useTransition()

  // Serverdaten fuer den heutigen Tag gewinnen (Echtzeit-Aktualisierung).
  useEffect(() => {
    if (offset !== 0) return
    setSegments(initialSegments)
    setPlanned(initialPlanned)
    setNowMinutes(initialNowMinutes)
    setLabel(initialLabel)
  }, [offset, initialSegments, initialPlanned, initialNowMinutes, initialLabel])

  const changeDay = useCallback(
    (next: number) => {
      if (next > 0) return
      setOffset(next)
      startTransition(async () => {
        const data = await loadDaySegmentsAction(childId, next)
        setSegments(data.segments)
        setPlanned(data.planned)
        setNowMinutes(data.nowMinutes)
        setLabel(data.label)
      })
    },
    [childId],
  )

  return (
    <DayClock
      segments={segments}
      planned={planned}
      nowMinutes={nowMinutes}
      dayOffset={offset}
      onDayOffsetChange={changeDay}
      dayLabel={label}
      canGoForward={offset < 0}
    />
  )
}
