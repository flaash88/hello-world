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
  test('sagt ehrlich, dass der Rhythmus noch nicht bekannt ist', async ({ page }) => {
    const code = await createHouseholdInvite()
    const email = uniqueEmail('kalib')
    await register(page, { name: 'Mama', email, code })
    await setUpChild(page, 'Lina', 90)

    await seedSleep(email, 3, 100)
    await page.goto('/')

    await expect(page.getByText('Euren Rhythmus kennt die App noch nicht.')).toBeVisible()
    // Keine erfundene Uhrzeit und keine Fortschrittszahl, solange die Datenlage
    // das nicht hergibt.
    await expect(page.getByText(/von 5 nötigen Messungen/)).toHaveCount(0)
    await expect(page.getByText('Konfidenz', { exact: false })).toHaveCount(0)
  })

  test('nennt mit genug Daten ein Zeitfenster – als Beobachtung, nicht als Anweisung', async ({
    page,
  }) => {
    const code = await createHouseholdInvite()
    const email = uniqueEmail('vorhersage')
    await register(page, { name: 'Mama', email, code })
    await setUpChild(page, 'Lina', 90)

    await seedSleep(email, 20, 110)
    await page.goto('/')

    await expect(page.getByText('Euren Rhythmus kennt die App noch nicht.')).toHaveCount(0)
    await expect(page.getByText(/könnte Müdigkeit kommen|ging es zuletzt in die Nacht/)).toBeVisible()
    await expect(page.getByText(/Zuletzt lagen zwischen Aufwachen und Einschlafen/)).toBeVisible()
    // Der feste Hinweis steht darunter und ist nicht wegklickbar.
    await expect(page.getByText('Euer Kind kennt seinen Rhythmus besser als die App.')).toBeVisible()
    // Keine Konfidenz in Prozent, kein Imperativ.
    await expect(page.getByText(/Konfidenz/)).toHaveCount(0)
    await expect(page.getByText(/Zeit für/)).toHaveCount(0)
  })

  test('zeigt die Wachzeit ohne Ampel und ohne Sollwert', async ({ page }) => {
    const code = await createHouseholdInvite()
    const email = uniqueEmail('druck')
    await register(page, { name: 'Mama', email, code })
    await setUpChild(page, 'Lina', 90)

    await seedSleep(email, 20, 110)
    await page.goto('/')

    await expect(page.getByRole('img', { name: /Wach seit/ })).toBeVisible()
    await expect(page.getByText('Schlaf heute')).toBeVisible()
    await expect(page.getByText(/Die Spanne ist breit, und eures muss sie nicht treffen/)).toBeVisible()
    // Kein Tagesziel, kein Fortschrittsbalken, keine Prozentzahl im Ring.
    await expect(page.getByText('Tagesziel')).toHaveCount(0)
    await expect(page.getByText(/im Zielbereich|noch \d/)).toHaveCount(0)
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
