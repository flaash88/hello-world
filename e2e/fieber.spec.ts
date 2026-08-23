import { test, expect, type Page } from '@playwright/test'
import { createHouseholdInvite, register, setUpChild, uniqueEmail } from './helpers'

/** Trägt über die Schnellaktionen ein Gesundheits-Event ein. */
async function traegeTemperaturEin(page: Page, wert: string) {
  await page.goto('/heute')
  await page.getByRole('button', { name: 'Etwas anderes eintragen' }).click()
  await page.getByRole('button', { name: 'Gesundheit', exact: true }).click()
  await page.getByRole('textbox', { name: /^Temperatur/ }).fill(wert)
  await page.getByRole('button', { name: 'Speichern' }).click()
}

test.describe('Fieberverlauf', () => {
  test('bleibt ohne Fieber verschlossen', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('fieber'), code })
    await setUpChild(page, 'Lina', 200)

    await page.goto('/gesundheit/fieber')
    await expect(page.getByText('Gerade kein Fieber')).toBeVisible()
    await expect(page.getByText(/37,5 °C/)).toBeVisible()
  })

  test('schaltet frei, sobald eine erhöhte Temperatur eingetragen ist', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('fieber2'), code })
    await setUpChild(page, 'Lina', 200)

    await traegeTemperaturEin(page, '38,6')

    await page.goto('/gesundheit/fieber')
    await expect(page.getByRole('heading', { name: 'Fieberverlauf' })).toBeVisible()
    await expect(page.getByText(/höchste 38,6 °C/)).toBeVisible()
  })

  test('zeigt beim ersten Öffnen, was die Ansicht nicht tut', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('fieber3'), code })
    await setUpChild(page, 'Lina', 200)
    await traegeTemperaturEin(page, '38,2')

    await page.goto('/gesundheit/fieber')
    await expect(page.getByText('Was diese Ansicht tut – und was nicht')).toBeVisible()
    await expect(page.getByText(/Sie rechnet .*keine.* Dosierungen aus/)).toBeVisible()

    await page.getByRole('button', { name: 'Verstanden' }).click()
    await expect(page.getByText('Was diese Ansicht tut – und was nicht')).toBeHidden()

    // Beim zweiten Öffnen bleibt der Hinweis weg.
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Fieberverlauf' })).toBeVisible()
    await expect(page.getByText('Was diese Ansicht tut – und was nicht')).toBeHidden()
  })

  test('nennt das selbst eingetragene Intervall und zählt die Gaben', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('fieber4'), code })
    await setUpChild(page, 'Lina', 200)
    await traegeTemperaturEin(page, '39,1')

    await page.goto('/heute')
    await page.getByRole('button', { name: 'Etwas anderes eintragen' }).click()
    await page.getByRole('button', { name: 'Gesundheit', exact: true }).click()
    await page.getByRole('button', { name: 'Medikament', exact: true }).click()
    await page.getByLabel('Medikament', { exact: true }).fill('Nurofen')
    await page.getByRole('textbox', { name: /^Frühestens wieder in/ }).fill('6')
    await page.getByRole('button', { name: 'Speichern' }).click()

    await page.goto('/gesundheit/fieber')
    await page.getByRole('button', { name: 'Verstanden' }).click()
    await expect(page.getByText('Nurofen').first()).toBeVisible()
    await expect(page.getByText(/Nächste Dosis frühestens ab \d{2}:\d{2}/)).toBeVisible()
    await expect(page.getByText('1 Gabe in den letzten 24 Stunden')).toBeVisible()
  })

  test('stellt den Zettel für die Ordination zusammen', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('fieber5'), code })
    await setUpChild(page, 'Lina', 200)
    await traegeTemperaturEin(page, '38,9')

    await page.goto('/gesundheit/fieber')
    await expect(page.getByRole('heading', { name: 'Zettel für die Ordination' })).toBeVisible()
    const zettel = page.getByRole('region').or(page.locator('section')).filter({
      hasText: 'Zettel für die Ordination',
    })
    await expect(zettel.getByText('Lina', { exact: true })).toBeVisible()
    await expect(zettel.getByText(/\(6 Monate\)/)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Messungen' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Platz für Notizen' })).toBeVisible()
  })

  test('verlinkt vom Dashboard aus', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('fieber6'), code })
    await setUpChild(page, 'Lina', 200)
    await traegeTemperaturEin(page, '38,4')

    await page.goto('/heute')
    await page.getByRole('link', { name: /Fieberverlauf/ }).click()
    await expect(page.getByRole('heading', { name: 'Fieberverlauf' })).toBeVisible()
  })
})
