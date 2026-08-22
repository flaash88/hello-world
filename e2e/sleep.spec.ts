import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { createHouseholdInvite, register, setUpChild, uniqueEmail } from './helpers'

const prisma = new PrismaClient()

/**
 * Legt `count` abgeschlossene Nickerchen mit festem Wachfenster direkt in der
 * Datenbank an – über die UI würde das Stunden dauern.
 */
async function seedSleep(email: string, count: number, wakeMin: number, sleepMin = 60) {
  const user = await prisma.user.findUniqueOrThrow({ where: { email } })
  const child = await prisma.child.findFirstOrThrow({ where: { householdId: user.householdId } })

  const cycleMs = (wakeMin + sleepMin) * 60_000
  // Das letzte Aufwachen liegt 30 Minuten zurück, damit ein Fenster bevorsteht.
  const lastWake = Date.now() - 30 * 60_000

  for (let i = 0; i < count; i++) {
    const endedAt = new Date(lastWake - i * cycleMs)
    const startedAt = new Date(endedAt.getTime() - sleepMin * 60_000)
    await prisma.event.create({
      data: {
        childId: child.id,
        type: 'sleep',
        startedAt,
        endedAt,
        durationSec: sleepMin * 60,
        payload: { kind: 'nap' },
        createdById: user.id,
      },
    })
  }
  return child
}

test.describe('Schlaf-Dashboard', () => {
  test('sagt ehrlich "Kalibriert noch", solange Daten fehlen', async ({ page }) => {
    const code = await createHouseholdInvite()
    const email = uniqueEmail('kalib')
    await register(page, { name: 'Mama', email, code })
    await setUpChild(page, 'Lina', 90)

    await seedSleep(email, 3, 100)
    await page.goto('/')

    await expect(page.getByText('Kalibriert noch')).toBeVisible()
    await expect(page.getByText(/von 5 nötigen Messungen/)).toBeVisible()
    // Keine erfundene Uhrzeit, solange die Datenlage das nicht hergibt.
    await expect(page.getByText('Konfidenz', { exact: false })).toHaveCount(0)
  })

  test('sagt mit genug Daten ein Zeitfenster mit Konfidenz vorher', async ({ page }) => {
    const code = await createHouseholdInvite()
    const email = uniqueEmail('vorhersage')
    await register(page, { name: 'Mama', email, code })
    await setUpChild(page, 'Lina', 90)

    await seedSleep(email, 20, 110)
    await page.goto('/')

    await expect(page.getByText('Kalibriert noch')).toHaveCount(0)
    await expect(page.getByText(/Nächstes Nickerchen|Bettzeit/)).toBeVisible()
    await expect(page.getByText(/^\d{2}:\d{2}–\d{2}:\d{2}$/)).toBeVisible()
    await expect(page.getByText(/Konfidenz \d+ %/)).toBeVisible()
    await expect(page.getByText(/Wachfenster aktuell rund/)).toBeVisible()
  })

  test('zeigt Schlafdruck und Tagesziel', async ({ page }) => {
    const code = await createHouseholdInvite()
    const email = uniqueEmail('druck')
    await register(page, { name: 'Mama', email, code })
    await setUpChild(page, 'Lina', 90)

    await seedSleep(email, 20, 110)
    await page.goto('/')

    await expect(page.getByLabel(/Schlafdruck \d+ Prozent/)).toBeVisible()
    await expect(page.getByText('Tagesziel')).toBeVisible()
    await expect(page.getByText(/Üblich in diesem Alter/)).toBeVisible()
  })

  test('zeigt die 24-Stunden-Uhr und lässt zurückblättern', async ({ page }) => {
    const code = await createHouseholdInvite()
    const email = uniqueEmail('uhr')
    await register(page, { name: 'Mama', email, code })
    await setUpChild(page, 'Lina', 90)

    await seedSleep(email, 20, 110)
    await page.goto('/')

    await expect(page.getByRole('img', { name: /Tagesübersicht für Heute/ })).toBeVisible()
    await page.getByRole('button', { name: 'Vorheriger Tag' }).click()
    await expect(page.getByText('Gestern')).toBeVisible()
    await page.getByRole('button', { name: 'Nächster Tag' }).click()
    await expect(page.getByRole('img', { name: /Tagesübersicht für Heute/ })).toBeVisible()
  })

  test('meldet laufenden Schlaf statt einer Vorhersage', async ({ page }) => {
    const code = await createHouseholdInvite()
    const email = uniqueEmail('schlaeft')
    await register(page, { name: 'Mama', email, code })
    await setUpChild(page, 'Lina', 90)

    await seedSleep(email, 20, 110)
    await page.goto('/')
    await page.getByRole('button', { name: /^Schlaf/ }).click()

    await expect(page.getByText('Schläft gerade')).toBeVisible()
  })
})
