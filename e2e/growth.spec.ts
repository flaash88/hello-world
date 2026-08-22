import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { createHouseholdInvite, register, setUpChild, uniqueEmail } from './helpers'

const prisma = new PrismaClient()

test.describe('Wachstum', () => {
  test('trägt eine Messung ein und zeigt das WHO-Perzentil', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('wachstum'), code })
    await setUpChild(page, 'Lina', 279)

    await page.goto('/wachstum')
    await page.getByRole('button', { name: 'Messung eintragen' }).click()
    await page.getByRole('textbox', { name: /^Gewicht/ }).fill('8,9')
    await page.getByRole('textbox', { name: /^Länge/ }).fill('71')
    await page.getByRole('button', { name: 'Speichern' }).click()

    await expect(page.getByText('Zuletzt gemessen')).toBeVisible()
    // Mädchen, 279 Tage, 8,9 kg liegt laut WHO knapp über P70.
    await expect(page.getByText('P73').first()).toBeVisible()
  })

  test('weist ohne Geburtsdatum ehrlich darauf hin', async ({ page }) => {
    const code = await createHouseholdInvite()
    const email = uniqueEmail('ohnedatum')
    await register(page, { name: 'Mama', email, code })
    await setUpChild(page, 'Lina', 30)

    const user = await prisma.user.findUniqueOrThrow({ where: { email } })
    await prisma.child.updateMany({
      where: { householdId: user.householdId },
      data: { birthDate: null },
    })

    await page.goto('/wachstum')
    await expect(page.getByText('Noch kein Geburtsdatum hinterlegt')).toBeVisible()
  })

  test('zeigt die Perzentilkurven und lässt zwischen Maßen wechseln', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('kurven'), code })
    await setUpChild(page, 'Lina', 200)

    await page.goto('/wachstum')
    await page.getByRole('button', { name: 'Messung eintragen' }).click()
    await page.getByRole('textbox', { name: /^Gewicht/ }).fill('7,5')
    await page.getByRole('textbox', { name: /^Kopfumfang/ }).fill('43')
    await page.getByRole('button', { name: 'Speichern' }).click()

    await expect(page.getByText('Gewicht nach WHO-Standard')).toBeVisible()
    await page.getByRole('tab', { name: 'Kopfumfang' }).click()
    await expect(page.getByText('Kopfumfang nach WHO-Standard')).toBeVisible()
  })

  test('lehnt eine Messung ohne Werte ab', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('leer'), code })
    await setUpChild(page, 'Lina', 100)

    await page.goto('/wachstum')
    await page.getByRole('button', { name: 'Messung eintragen' }).click()
    await page.getByRole('button', { name: 'Speichern' }).click()

    await expect(page.getByTestId('form-error')).toContainText('mindestens einen Messwert')
  })
})
