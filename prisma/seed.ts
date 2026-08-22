/**
 * Legt den Haushalt und den ersten Einladungscode an, damit sich die erste
 * Person registrieren kann. Mehrfach ausfuehrbar (idempotent).
 *
 * Aufruf: npm run db:seed
 */
import { PrismaClient } from '@prisma/client'
import { createHash } from 'node:crypto'

const prisma = new PrismaClient()

function hashToken(token: string): string {
  const secret = process.env.SESSION_SECRET ?? ''
  return createHash('sha256').update(`${secret}:${token}`).digest('hex')
}

async function main() {
  const householdName = process.env.HOUSEHOLD_NAME ?? 'Unsere Familie'
  const inviteCode = (process.env.BOOTSTRAP_INVITE_CODE ?? '').trim().toUpperCase()

  if (!inviteCode) {
    throw new Error('BOOTSTRAP_INVITE_CODE ist nicht gesetzt – siehe .env.example.')
  }

  const existing = await prisma.household.findFirst()
  const household =
    existing ??
    (await prisma.household.create({
      data: {
        name: householdName,
        timezone: process.env.TZ ?? 'Europe/Vienna',
        settings: { create: {} },
      },
    }))

  if (!existing) {
    console.log(`Haushalt "${household.name}" angelegt.`)
  }

  const codeHash = hashToken(inviteCode)
  const invite = await prisma.invite.findUnique({ where: { codeHash } })
  if (invite) {
    console.log('Bootstrap-Einladungscode existiert bereits.')
  } else {
    await prisma.invite.create({
      data: {
        householdId: household.id,
        codeHash,
        label: 'Erstanmeldung',
        expiresAt: new Date(Date.now() + 30 * 86400000),
      },
    })
    console.log(`Einladungscode "${inviteCode}" angelegt (30 Tage gültig).`)
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
