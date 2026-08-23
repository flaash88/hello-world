import { test, expect, type Page } from '@playwright/test'
import { createHouseholdInvite, register, setUpChild, uniqueEmail } from './helpers'

async function trageEin(page: Page, knopf: RegExp | string) {
  await page.goto('/heute')
  await page.getByRole('button', { name: knopf }).first().click()
  await page.getByRole('button', { name: 'Speichern' }).click()
}

test.describe('Stillprotokoll', () => {
  test.beforeEach(async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('prot'), code })
    await setUpChild(page, 'Lina', 5)
  })

  test('zeigt eine Tabelle mit Tag, Lebenstag und Durchschnitt', async ({ page }) => {
    await page.goto('/protokoll')
    await expect(page.getByRole('heading', { name: 'Stillprotokoll' })).toBeVisible()

    const tabelle = page.getByTestId('protokoll-tabelle')
    // Sieben Tage im Standard.
    await expect(tabelle.locator('tbody tr')).toHaveCount(7)
    await expect(tabelle.getByText('LT')).toBeVisible()
    await expect(tabelle.getByText('⌀ pro Tag')).toBeVisible()

    // Heute ist Lebenstag 5, die Zeile steht oben.
    await expect(tabelle.locator('tbody tr').first().locator('td').first()).toHaveText('5')
  })

  test('lässt den Zeitraum wechseln', async ({ page }) => {
    await page.goto('/protokoll')
    await page.getByLabel('Zeitraum').getByRole('link', { name: 'Heute' }).click()
    await expect(page.getByTestId('protokoll-tabelle').locator('tbody tr')).toHaveCount(1)

    await page.getByLabel('Zeitraum').getByRole('link', { name: '14 Tage' }).click()
    await expect(page.getByTestId('protokoll-tabelle').locator('tbody tr')).toHaveCount(14)
  })

  test('zählt Windeln und lässt leere Zellen leer', async ({ page }) => {
    await trageEin(page, /^Windel/)

    await page.goto('/protokoll?tage=1')
    const zeile = page.getByTestId('protokoll-tabelle').locator('tbody tr').first()
    // Nass zählt, Anlegen bleibt leer statt eine Null zu behaupten.
    await expect(zeile.locator('td').nth(5)).toHaveText('1')
    await expect(zeile.locator('td').nth(1)).toHaveText('')
  })

  test('öffnet die Einzelereignisse eines Tages', async ({ page }) => {
    await trageEin(page, /^Windel/)

    await page.goto('/protokoll?tage=1')
    await page.getByTestId('protokoll-tabelle').locator('tbody tr').first().click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog').getByText(/Lebenstag 5/)).toBeVisible()
    await expect(page.getByRole('dialog').getByText(/Windel/)).toBeVisible()
  })

  test('trägt die gemeinsame Kopfzeile mit Kind und Zeitraum', async ({ page }) => {
    await page.goto('/mehr/kind')
    await page.getByLabel('Geburtsgewicht (g)').fill('3400')
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByText('Gespeichert')).toBeVisible()

    await page.goto('/protokoll')
    await expect(page.getByText('Lina', { exact: true })).toBeVisible()
    await expect(page.getByText(/^3\s?400 g$/)).toBeVisible()
    await expect(page.getByText('Zeitraum')).toBeVisible()
  })

  test('liefert ein PDF aus', async ({ page }) => {
    await page.goto('/protokoll')
    const link = page.getByRole('link', { name: 'Als PDF herunterladen' })
    const href = await link.getAttribute('href')
    expect(href).toContain('/api/protokoll/pdf')

    const antwort = await page.request.get(href!)
    expect(antwort.status()).toBe(200)
    expect(antwort.headers()['content-type']).toBe('application/pdf')
    expect(antwort.headers()['content-disposition']).toContain('stillprotokoll-lina-')
    // Ein PDF beginnt mit %PDF.
    expect((await antwort.body()).subarray(0, 4).toString()).toBe('%PDF')
  })

  test('ist in den ersten Wochen vom Dashboard aus erreichbar', async ({ page }) => {
    await page.goto('/heute')
    await page.getByRole('link', { name: /Stillprotokoll/ }).click()
    await expect(page.getByRole('heading', { name: 'Stillprotokoll' })).toBeVisible()
  })
})

test.describe('Stillprotokoll nach dem Wochenbett', () => {
  test('verschwindet die Karte vom Dashboard', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('prot2'), code })
    await setUpChild(page, 'Lina', 60)

    await page.goto('/heute')
    await expect(page.getByRole('link', { name: /Stillprotokoll/ })).toBeHidden()
    // Über „Mehr" bleibt es erreichbar.
    await page.goto('/mehr')
    await expect(page.getByRole('link', { name: /Stillprotokoll/ })).toBeVisible()
  })
})
