import { test, expect, type Page } from '@playwright/test'
import { createHouseholdInvite, register, setUpChild, uniqueEmail } from './helpers'

/**
 * Alles, was aus der App herausgereicht wird, kommt als PDF heraus.
 *
 * Grund: In der vom Startbildschirm gestarteten App auf dem iPhone bewirkt
 * `window.print()` nichts, und ein Download landet nirgends. Ein PDF öffnet
 * der Browser in seinem Betrachter, und dort gibt es Drucken und Teilen.
 * Deshalb wird hier nicht nur geprüft, dass ein PDF entsteht, sondern auch,
 * dass es `inline` ausgeliefert wird.
 */
async function pruefePdf(page: Page, href: string, dateiname: RegExp): Promise<void> {
  const antwort = await page.request.get(href)
  expect(antwort.status()).toBe(200)
  expect(antwort.headers()['content-type']).toBe('application/pdf')

  const disposition = antwort.headers()['content-disposition'] ?? ''
  expect(disposition).toContain('inline;')
  expect(disposition).toMatch(dateiname)

  expect((await antwort.body()).subarray(0, 5).toString()).toBe('%PDF-')
}

test.describe('Fieber eintragen', () => {
  test.beforeEach(async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('fieber'), code })
    await setUpChild(page, 'Lina', 200)
  })

  test('legt die Temperatur aus dem Fieberbereich heraus an', async ({ page }) => {
    await page.goto('/gesundheit/fieber')
    await expect(page.getByText('Gerade kein Fieber')).toBeVisible()

    // Vorher führte dieser Knopf auf das Dashboard und tat sonst nichts.
    await page.getByRole('button', { name: 'Temperatur eintragen' }).click()
    await page.getByRole('textbox', { name: /^Temperatur/ }).fill('38,9')
    await page.getByRole('button', { name: 'Speichern' }).click()

    await expect(page.getByRole('heading', { name: 'Fieberverlauf' })).toBeVisible()
    await expect(page.getByText(/38,9 °C/).first()).toBeVisible()
  })

  test('lässt während der Episode weiter eintragen, ohne Umweg', async ({ page }) => {
    await page.goto('/gesundheit/fieber')
    await page.getByRole('button', { name: 'Temperatur eintragen' }).click()
    await page.getByRole('textbox', { name: /^Temperatur/ }).fill('38,5')
    await page.getByRole('button', { name: 'Speichern' }).click()
    await page.getByRole('button', { name: 'Verstanden' }).click()

    await page.getByRole('button', { name: 'Temperatur eintragen' }).click()
    await page.getByRole('textbox', { name: /^Temperatur/ }).fill('39,4')
    await page.getByRole('button', { name: 'Speichern' }).click()

    await expect(page.getByText(/höchste 39,4 °C/)).toBeVisible()
  })

  test('gibt den Arztzettel als PDF aus', async ({ page }) => {
    await page.goto('/gesundheit/fieber')
    await page.getByRole('button', { name: 'Temperatur eintragen' }).click()
    await page.getByRole('textbox', { name: /^Temperatur/ }).fill('38,9')
    await page.getByRole('button', { name: 'Speichern' }).click()
    await page.getByRole('button', { name: 'Verstanden' }).click()

    const href = await page.getByRole('link', { name: 'Als PDF öffnen' }).getAttribute('href')
    expect(href).toContain('/api/fieber/pdf')
    await pruefePdf(page, href!, /fieberverlauf-lina-/)
  })

  test('gibt ohne laufende Episode keinen Zettel aus', async ({ page }) => {
    // Lieber nichts als eine leere Seite, die so tut, als gäbe es etwas.
    const antwort = await page.request.get('/api/fieber/pdf')
    expect(antwort.status()).toBe(404)
  })
})

test.describe('Druckansichten als PDF', () => {
  test.beforeEach(async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('pdf'), code })
    await setUpChild(page, 'Lina', 300)
  })

  test('Zahnschema', async ({ page }) => {
    await page.goto('/zaehne')
    const href = await page.getByRole('link', { name: 'Als PDF öffnen' }).getAttribute('href')
    expect(href).toContain('/api/zaehne/pdf')
    await pruefePdf(page, href!, /zaehne-lina-/)
  })

  test('Etikettenbogen', async ({ page }) => {
    await page.goto('/vorrat')
    await page.getByRole('button', { name: 'Portion einlagern' }).click()
    await page.getByLabel('Menge (ml)').fill('130')
    await page.getByRole('button', { name: 'Einlagern' }).click()

    await page.getByRole('link', { name: 'Etiketten drucken' }).click()
    const href = await page.getByRole('link', { name: 'Als PDF öffnen' }).getAttribute('href')
    expect(href).toBe('/api/etiketten/pdf')
    await pruefePdf(page, href!, /etiketten\.pdf/)
  })

  test('Etikettenbogen bleibt ohne Vorrat aus', async ({ page }) => {
    const antwort = await page.request.get('/api/etiketten/pdf')
    expect(antwort.status()).toBe(404)
  })

  test('Jahresrückblick', async ({ page }) => {
    await page.goto('/tagebuch')
    await page.getByRole('link', { name: 'Jahresrückblick' }).click()
    await page.waitForURL(/\/tagebuch\/rueckblick$/)

    const href = await page.getByRole('link', { name: 'Als PDF öffnen' }).getAttribute('href')
    expect(href).toContain('/api/rueckblick/pdf')
    await pruefePdf(page, href!, /rueckblick-\d{4}\.pdf/)
  })

  test('bleibt für Fremde verschlossen', async ({ page, context }) => {
    await context.clearCookies()
    const antwort = await page.request.get('/api/zaehne/pdf')
    expect(antwort.status()).toBe(401)
  })
})
