/**
 * Bootstrap fuer den Container: Haushalt und erster Einladungscode.
 * Identisch zu prisma/seed.ts, aber ohne tsx – laeuft im schlanken Runtime-Image.
 */
import { PrismaClient } from '@prisma/client'
import { createHash } from 'node:crypto'

const prisma = new PrismaClient()

const inviteCode = (process.env.BOOTSTRAP_INVITE_CODE ?? '').trim().toUpperCase()
if (!inviteCode) {
  console.log('[seed] BOOTSTRAP_INVITE_CODE nicht gesetzt – uebersprungen.')
  process.exit(0)
}

const codeHash = createHash('sha256')
  .update(`${process.env.SESSION_SECRET ?? ''}:${inviteCode}`)
  .digest('hex')

const household =
  (await prisma.household.findFirst()) ??
  (await prisma.household.create({
    data: {
      name: process.env.HOUSEHOLD_NAME ?? 'Unsere Familie',
      timezone: process.env.TZ ?? 'Europe/Vienna',
      settings: { create: {} },
    },
  }))

const userCount = await prisma.user.count()
const existingInvite = await prisma.invite.findUnique({ where: { codeHash } })

// Der Bootstrap-Code wird nur angelegt, solange es noch keinen User gibt.
if (!existingInvite && userCount === 0) {
  await prisma.invite.create({
    data: {
      householdId: household.id,
      codeHash,
      label: 'Erstanmeldung',
      expiresAt: new Date(Date.now() + 30 * 86400000),
    },
  })
  console.log('[seed] Einladungscode fuer die Erstanmeldung angelegt.')
} else {
  console.log('[seed] Nichts zu tun.')
}

await prisma.$disconnect()
