import type { Metadata } from 'next'
import { getAppContext } from '@/lib/household'
import { prisma } from '@/lib/db'
import { addDays, localDateKey, startOfLocalDay } from '@/lib/time'
import { SUPPORT_LOOKBACK_DAYS, evaluateSupportSignal, type ParentDay } from '@/lib/parents/support'
import { ParentsView } from './parents-view'

export const metadata: Metadata = { title: 'Wir' }

export default async function ParentsPage() {
  const ctx = await getAppContext()
  const today = startOfLocalDay(new Date(), ctx.timezone)
  const since = addDays(today, -SUPPORT_LOOKBACK_DAYS, ctx.timezone)
  const todayKey = localDateKey(new Date(), ctx.timezone)

  const [moods, sleepLogs, journal, shifts, childSleepEvents] = await Promise.all([
    prisma.moodLog.findMany({
      where: { userId: ctx.user.id, date: { gte: since } },
      orderBy: { date: 'desc' },
    }),
    prisma.parentSleepLog.findMany({
      where: { userId: ctx.user.id, date: { gte: since } },
      orderBy: { date: 'desc' },
    }),
    // Bewusst nur die eigenen Einträge – der einzige private Bereich.
    prisma.parentJournalEntry.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.nightShift.findMany({
      where: { householdId: ctx.household.id, date: { gte: addDays(today, -7, ctx.timezone) } },
      orderBy: { date: 'desc' },
    }),
    ctx.activeChild
      ? prisma.event.findMany({
          where: {
            childId: ctx.activeChild.id,
            type: 'sleep',
            deletedAt: null,
            startedAt: { gte: since },
          },
          select: { startedAt: true, endedAt: true, durationSec: true, payload: true },
        })
      : Promise.resolve([]),
  ])

  const moodByDate = new Map(moods.map((entry) => [localDateKey(entry.date, 'UTC'), entry]))
  const sleepByDate = new Map(sleepLogs.map((entry) => [localDateKey(entry.date, 'UTC'), entry]))

  const days: ParentDay[] = []
  for (let i = 0; i < SUPPORT_LOOKBACK_DAYS; i++) {
    const key = localDateKey(addDays(today, -i, ctx.timezone), ctx.timezone)
    const mood = moodByDate.get(key)
    const sleep = sleepByDate.get(key)
    days.push({
      date: key,
      mood: mood?.mood ?? null,
      energy: mood?.energy ?? null,
      stress: mood?.stress ?? null,
      sleepHours: sleep?.hours ?? null,
    })
  }

  // Nachtwachen des Kindes je Tag – für den Vergleich mit dem eigenen Schlaf.
  const childWakesByDate = new Map<string, number>()
  for (const event of childSleepEvents) {
    const payload = event.payload as { wakeCount?: number; kind?: string } | null
    if (payload?.kind !== 'night') continue
    const key = localDateKey(event.startedAt, ctx.timezone)
    childWakesByDate.set(key, (childWakesByDate.get(key) ?? 0) + (payload.wakeCount ?? 0))
  }

  const signal = evaluateSupportSignal(days)
  const todayShift = shifts.find((shift) => localDateKey(shift.date, 'UTC') === todayKey) ?? null

  return (
    <ParentsView
      userId={ctx.user.id}
      userName={ctx.user.displayName}
      members={ctx.members}
      todayKey={todayKey}
      today={{
        mood: moodByDate.get(todayKey)?.mood ?? null,
        energy: moodByDate.get(todayKey)?.energy ?? null,
        stress: moodByDate.get(todayKey)?.stress ?? null,
        note: moodByDate.get(todayKey)?.note ?? null,
        sleepHours: sleepByDate.get(todayKey)?.hours ?? null,
        sleepQuality: sleepByDate.get(todayKey)?.quality ?? null,
        wakeCount: sleepByDate.get(todayKey)?.wakeCount ?? null,
      }}
      days={days}
      childWakes={days.map((day) => childWakesByDate.get(day.date) ?? 0)}
      signal={signal}
      journal={journal.map((entry) => ({
        id: entry.id,
        body: entry.body,
        mood: entry.mood,
        createdAt: entry.createdAt.toISOString(),
      }))}
      shift={
        todayShift
          ? { userId: todayShift.userId, handoverNote: todayShift.handoverNote }
          : { userId: null, handoverNote: null }
      }
      recentShifts={shifts
        .filter((shift) => localDateKey(shift.date, 'UTC') !== todayKey)
        .map((shift) => ({
          date: localDateKey(shift.date, 'UTC'),
          userId: shift.userId,
          handoverNote: shift.handoverNote,
        }))}
    />
  )
}
