import { test, expect, type Page } from '@playwright/test'
import { createHouseholdInvite, register, setUpChild, uniqueEmail } from './helpers'

async function lagereEin(page: Page, mengeMl: string, lagerort = 'Kühlschrank') {
  await page.getByRole('button', { name: 'Portion einlagern' }).click()
  await page.getByLabel('Menge (ml)').fill(mengeMl)
  if (lagerort !== 'Kühlschrank') {
    await page.getByLabel('Wohin').click()
    await page.getByRole('option', { name: lagerort }).click()
  }
  await page.getByRole('button', { name: 'Einlagern' }).click()
}

test.describe('Milchvorrat', () => {
  test.beforeEach(async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('vorrat'), code })
    await setUpChild(page, 'Lina', 60)
    await page.goto('/vorrat')
  })

  test('lagert eine Portion ein und summiert nach Lagerort', async ({ page }) => {
    await expect(page.getByText('Noch nichts eingelagert')).toBeVisible()

    await lagereEin(page, '120')
    await lagereEin(page, '80')

    await expect(page.getByText('200 ml in 2 Portionen')).toBeVisible()
    await expect(page.getByText('200 ml · 2 Portionen')).toBeVisible()
    await expect(page.getByText(/Haltbar 4 Tage/)).toBeVisible()
  })

  test('schlägt die älteste Portion als nächste vor', async ({ page }) => {
    await lagereEin(page, '90', 'Tiefkühler')
    await lagereEin(page, '120')

    const karte = page.locator('div').filter({ hasText: /^Als nächstes verwenden/ }).first()
    await expect(page.getByText('Als nächstes verwenden')).toBeVisible()
    // Der Kühlschrank läuft früher ab als der Tiefkühler.
    await expect(karte.getByText(/120 ml · Kühlschrank/)).toBeVisible()
  })

  test('entnimmt eine Teilmenge und lässt den Rest stehen', async ({ page }) => {
    await lagereEin(page, '150')

    await page.getByRole('button', { name: 'Teilmenge' }).first().click()
    await page.getByLabel('Entnommen (ml)').fill('50')
    await page.getByRole('button', { name: 'Entnehmen' }).click()

    await expect(page.getByText('100 ml in 1 Portion')).toBeVisible()
  })

  test('verbraucht eine Portion mit einem Tap', async ({ page }) => {
    await lagereEin(page, '110')
    await page.getByRole('button', { name: 'Verbraucht' }).first().click()
    await expect(page.getByText('0 ml in 0 Portionen')).toBeVisible()
    await expect(page.getByText('Noch nichts eingelagert')).toBeVisible()
  })

  test('gibt aufgetauter Milch ein kürzeres Fenster', async ({ page }) => {
    await lagereEin(page, '200', 'Tiefkühler')

    await page.getByRole('button', { name: /200 ml auftauen/ }).first().click()
    await expect(page.getByText('Aufgetaut').first()).toBeVisible()
    // Nach dem Auftauen liegt sie im Kühlschrank und läuft binnen 24 Stunden ab.
    await expect(page.getByText('Kühlschrank', { exact: true }).first()).toBeVisible()
    await expect(page.getByText(/haltbar bis .*\d{2}:\d{2}/).first()).toBeVisible()
  })

  test('lässt die Haltbarkeiten anpassen', async ({ page }) => {
    await lagereEin(page, '100')

    await page.getByRole('button', { name: 'Haltbarkeiten anpassen' }).click()
    await page.getByLabel(/^Kühlschrank/).fill('36')
    await page.getByRole('button', { name: 'Speichern' }).click()

    await expect(page.getByText(/Haltbar 36 Stunden/)).toBeVisible()
  })

  test('druckt Etiketten mit Datum, Menge und QR-Code', async ({ page }) => {
    await lagereEin(page, '130')

    await page.getByRole('link', { name: 'Etiketten drucken' }).click()
    await expect(page.getByRole('heading', { name: 'Etiketten' })).toBeVisible()
    await expect(page.getByText('1 von 24 auf einem A4-Bogen · 70 × 37 mm')).toBeVisible()

    const bogen = page.getByTestId('etikettenbogen')
    await expect(bogen.getByText('130 ml')).toBeVisible()
    await expect(bogen.getByText(/^Abgepumpt /)).toBeVisible()
    await expect(bogen.getByText(/^Bis /)).toBeVisible()
    // Der QR-Code führt zur Portion – ohne APP_URL bliebe er weg.
    await expect(bogen.locator('svg')).toHaveCount(1)
  })

  test('zählt die Statistik der letzten 30 Tage mit', async ({ page }) => {
    await lagereEin(page, '100')
    await lagereEin(page, '200')
    await page.getByRole('button', { name: 'Verbraucht' }).first().click()

    await expect(page.getByText('300 ml').first()).toBeVisible()
    await expect(page.getByText(/im Schnitt/)).toBeVisible()
  })
})
