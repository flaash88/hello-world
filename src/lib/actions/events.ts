'use server'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/session'
import { assertChildInHousehold } from '@/lib/household'
import {
  createEvent,
  deleteEvent,
  pauseTimer,
  restoreEvent,
  resumeTimer,
  startTimer,
  stopTimer,
  updateEvent,
  type CreateEventInput,
  type UpdateEventInput,
} from '@/lib/events/service'
import { isEventType, type EventType } from '@/lib/events/types'

export type ActionResult<T = Record<string, never>> = ({ ok: true } & T) | { error: string }

function refreshTrackerViews() {
  revalidatePath('/')
  revalidatePath('/verlauf')
}

export async function createEventAction(
  input: CreateEventInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()
  const result = await createEvent({ userId: user.id, householdId: user.householdId }, input)
  if (!result.ok) return { error: result.error }
  refreshTrackerViews()
  return { ok: true, id: result.data.id }
}

export async function updateEventAction(
  eventId: string,
  input: UpdateEventInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()
  const result = await updateEvent({ userId: user.id, householdId: user.householdId }, eventId, input)
  if (!result.ok) return { error: result.error }
  refreshTrackerViews()
  return { ok: true, id: result.data.id }
}

export async function deleteEventAction(eventId: string): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()
  const result = await deleteEvent({ userId: user.id, householdId: user.householdId }, eventId)
  if (!result.ok) return { error: result.error }
  refreshTrackerViews()
  return { ok: true, id: result.data.id }
}

export async function restoreEventAction(eventId: string): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()
  const result = await restoreEvent({ userId: user.id, householdId: user.householdId }, eventId)
  if (!result.ok) return { error: result.error }
  refreshTrackerViews()
  return { ok: true, id: result.data.id }
}

export async function startTimerAction(
  childId: string,
  type: string,
  payload: unknown = {},
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()
  await assertChildInHousehold(childId, user.householdId)
  if (!isEventType(type)) return { error: 'Unbekannte Art von Eintrag.' }

  const result = await startTimer(
    { userId: user.id, householdId: user.householdId },
    childId,
    type as EventType,
    payload,
  )
  if (!result.ok) return { error: result.error }
  refreshTrackerViews()
  return { ok: true, id: result.data.id }
}

export async function stopTimerAction(
  eventId: string,
  payload?: unknown,
  endedAt?: string,
): Promise<ActionResult<{ id: string; durationSec: number }>> {
  const user = await requireUser()
  const result = await stopTimer(
    { userId: user.id, householdId: user.householdId },
    eventId,
    payload,
    endedAt,
  )
  if (!result.ok) return { error: result.error }
  refreshTrackerViews()
  return { ok: true, id: result.data.id, durationSec: result.data.durationSec }
}

export async function pauseTimerAction(eventId: string): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()
  const result = await pauseTimer({ userId: user.id, householdId: user.householdId }, eventId)
  if (!result.ok) return { error: result.error }
  refreshTrackerViews()
  return { ok: true, id: result.data.id }
}

export async function resumeTimerAction(eventId: string): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()
  const result = await resumeTimer({ userId: user.id, householdId: user.householdId }, eventId)
  if (!result.ok) return { error: result.error }
  refreshTrackerViews()
  return { ok: true, id: result.data.id }
}
