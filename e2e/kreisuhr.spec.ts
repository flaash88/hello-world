import { test, expect } from '@playwright/test'
import { createHouseholdInvite, register, setUpChild, uniqueEmail } from './helpers'

/**
 * Die 24-Stunden-Kreisuhr.
 *
 * Zwei Dinge waren kaputt und sind hier festgehalten: Die vier
 * Stundenbeschriftungen lagen rechnerisch ausserhalb der Zeichenflaeche und
 * wurden abgeschnitten, und ein Eintrag ohne Dauer war als Bogen keine zwei
 * Pixel breit – sichtbar nicht, treffbar erst recht nicht.
 */
test.describe('Kreisuhr', () => {
  test.beforeEach(async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('uhr'), code })
    await setUpChild(page, 'Lina', 60)
    await page.goto('/heute')
    await page.getByRole('button', { name: 'Windel', exact: true }).click()
    await page.getByRole('button', { name: 'Speichern' }).click()
    await page.goto('/heute')
    await page.getByRole('img', { name: /Tagesübersicht/ }).scrollIntoViewIfNeeded()
  })

  test('zeigt alle vier Stundenbeschriftungen vollständig', async ({ page }) => {
    const svg = page.getByRole('img', { name: /Tagesübersicht/ })
    const flaeche = (await svg.boundingBox())!

    for (const stunde of ['00:00', '06:00', '12:00', '18:00']) {
      const label = svg.locator('text', { hasText: stunde })
      const box = (await label.boundingBox())!
      expect(box, `${stunde} fehlt`).not.toBeNull()
      // Vollständig innerhalb der Zeichenfläche – nicht am Rand abgeschnitten.
      expect(box.x, `${stunde} links`).toBeGreaterThanOrEqual(flaeche.x - 1)
      expect(box.x + box.width, `${stunde} rechts`).toBeLessThanOrEqual(
        flaeche.x + flaeche.width + 1,
      )
      expect(box.y, `${stunde} oben`).toBeGreaterThanOrEqual(flaeche.y - 1)
      expect(box.y + box.height, `${stunde} unten`).toBeLessThanOrEqual(
        flaeche.y + flaeche.height + 1,
      )
    }
  })

  test('zeichnet einen Eintrag ohne Dauer als sichtbare Marke', async ({ page }) => {
    const marke = page.locator('circle[data-eintrag="diaper"]')
    await expect(marke).toHaveCount(1)
    const box = (await marke.boundingBox())!
    // Als Bogen war das ein Strich von zwei Pixeln.
    expect(box.width).toBeGreaterThan(10)
    expect(box.height).toBeGreaterThan(10)
  })

  test('wählt den Eintrag auch bei einem Tap daneben aus', async ({ page }) => {
    const marke = page.locator('circle[data-eintrag="diaper"]')
    const box = (await marke.boundingBox())!

    // Zehn Pixel neben der Marke, aber im selben Ring: Genau das trifft man
    // nachts mit dem Daumen, und genau das ging vorher ins Leere.
    await page.mouse.click(box.x + box.width / 2 + 10, box.y + box.height / 2 + 10)

    await expect(page.getByText(/Windel/).first()).toBeVisible()
  })

  test('wählt nichts aus, wenn an einer leeren Stelle getippt wird', async ({ page }) => {
    const svg = page.getByRole('img', { name: /Tagesübersicht/ })
    const flaeche = (await svg.boundingBox())!

    // Die Mitte gehört zu keinem Ring.
    await page.mouse.click(flaeche.x + flaeche.width / 2, flaeche.y + flaeche.height / 2)
    await expect(page.getByText('Tippe in einen Ring für Details, wische für andere Tage.')).toBeVisible()
  })
})
