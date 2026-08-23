'use server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { deleteStoredFile, storeSound } from '@/lib/media/storage'

export type CustomSoundDto = {
  id: string
  name: string
  url: string
  bytes: number
  createdBy: string
}

/**
 * Nimmt eine eigene Audiodatei entgegen. Sie gehoert dem Haushalt, nicht einem
 * Kind – Einschlafgeraeusche ueberdauern das erste Jahr.
 */
export async function uploadCustomSoundAction(
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser()
  const file = formData.get('file')
  if (!(file instanceof File)) return { error: 'Keine Datei ausgewählt.' }

  const count = await prisma.customSound.count({ where: { householdId: user.householdId } })
  if (count >= 20) {
    return { error: 'Mehr als zwanzig eigene Klänge werden unübersichtlich – lösche zuerst einen.' }
  }

  const stored = await storeSound(file, user.householdId)
  if (!stored.ok) return { error: stored.error }

  const name = String(formData.get('name') ?? '').trim() || stored.sound.name

  await prisma.customSound.create({
    data: {
      householdId: user.householdId,
      name: name.slice(0, 60),
      path: stored.sound.path,
      mimeType: stored.sound.mimeType,
      bytes: stored.sound.bytes,
      createdById: user.id,
    },
  })
  revalidatePath('/sounds')
  return { ok: true }
}

export async function deleteCustomSoundAction(id: string): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser()
  const sound = await prisma.customSound.findFirst({
    where: { id, householdId: user.householdId },
  })
  if (!sound) return { error: 'Klang nicht gefunden.' }

  // Erst die Datenbank, dann die Datei – so bleibt nie ein Eintrag ohne Datei.
  await prisma.customSound.delete({ where: { id: sound.id } })
  await deleteStoredFile(sound.path)
  revalidatePath('/sounds')
  return { ok: true }
}
