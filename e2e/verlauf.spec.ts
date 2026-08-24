import { test, expect } from '@playwright/test'
import { createHouseholdInvite, register, setUpChild, uniqueEmail } from './helpers'

/**
 * Die Filterreihe im Verlauf.
 *
 * Sie lag vorher hinter der durchscheinenden Kopfzeile, sobald man ein Stück
 * gescrollt hatte: halb zu sehen und in der oberen Hälfte nicht mehr
 * antippbar. Deshalb wird hier gemessen, nicht nur nachgesehen, ob sie da ist.
 */
test.describe('Verlauf – Filterreihe', () => {
  test.beforeEach(async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('verlauf'), code })
    await setUpChild(page, 'Lina', 60)

    // Genug Einträge, damit die Seite wirklich scrollt.
    for (let i = 0; i < 12; i += 1) {
      await page.goto('/heute')
      await page.getByRole('button', { name: 'Windel', exact: true }).click()
      await page.getByRole('button', { name: 'Speichern' }).click()
    }
    await page.goto('/verlauf')
  })

  test('bleibt beim Scrollen vollständig unter der Kopfzeile stehen', async ({ page }) => {
    const chip = page.getByRole('link', { name: 'Alles', exact: true })
    const kopf = page.locator('header').first()

    await page.mouse.wheel(0, 1200)
    await page.waitForTimeout(300)

    const chipBox = await chip.boundingBox()
    const kopfBox = await kopf.boundingBox()
    expect(chipBox).not.toBeNull()
    expect(kopfBox).not.toBeNull()

    // Vollständig unterhalb der Kopfzeile – nicht angeschnitten.
    expect(chipBox!.y).toBeGreaterThanOrEqual(kopfBox!.y + kopfBox!.height - 1)
    // Und noch im Bild.
    const hoehe = page.viewportSize()!.height
    expect(chipBox!.y + chipBox!.height).toBeLessThan(hoehe)
  })

  test('hat Knöpfe, die man auch nachts trifft', async ({ page }) => {
    const chip = page.getByRole('link', { name: 'Alles', exact: true })
    const box = await chip.boundingBox()
    // Mindestens 48 px hoch, so wie jede wichtige Fläche in dieser App.
    expect(box!.height).toBeGreaterThanOrEqual(48)
  })

  test('lässt sich nach dem Scrollen ohne Zurückscrollen bedienen', async ({ page }) => {
    await page.mouse.wheel(0, 1200)
    await page.waitForTimeout(300)

    await page.getByRole('link', { name: 'Schlaf', exact: true }).click()
    await expect(page).toHaveURL(/typ=sleep/)
    await expect(page.getByText(/Für Schlaf gibt es noch keine Einträge/)).toBeVisible()
  })

  test('holt die gewählte Art in den Blick', async ({ page }) => {
    await page.goto('/verlauf?typ=pumping')
    const chip = page.getByRole('link', { name: 'Abpumpen', exact: true })
    await expect(chip).toBeInViewport()
    // Der gewählte Filter ist gefüllt, nicht nur zart getönt.
    await expect(chip).toHaveAttribute('aria-current', 'page')
  })
})
