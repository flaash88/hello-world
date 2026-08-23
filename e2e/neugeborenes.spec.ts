import { test, expect, type Page } from '@playwright/test'
import { createHouseholdInvite, register, setUpChild, uniqueEmail } from './helpers'

async function setzeGeburtsgewicht(page: Page, gramm: string) {
  await page.goto('/mehr/kind')
  await page.getByLabel('Geburtsgewicht (g)').fill(gramm)
  await page.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.getByText('Gespeichert', { exact: true })).toBeVisible()
}

async function wiege(page: Page, gramm: string) {
  await page.goto('/wachstum')
  await page.getByRole('button', { name: 'Gewicht eintragen' }).click()
  await page.getByLabel('Gewicht (g)').fill(gramm)
  await page.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
}

test.describe('Gewicht der ersten Wochen', () => {
  test('bleibt ohne Geburtsgewicht bei den Perzentilen', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('nb'), code })
    await setUpChild(page, 'Lina', 3)

    await page.goto('/wachstum')
    await expect(page.getByRole('heading', { name: 'Wachstum' })).toBeVisible()
  })

  test('zeigt in den ersten sechs Wochen den Verlauf statt der Perzentile', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('nb2'), code })
    await setUpChild(page, 'Lina', 3)
    await setzeGeburtsgewicht(page, '3400')

    await page.goto('/wachstum')
    await expect(page.getByRole('heading', { name: 'Gewicht', exact: true })).toBeVisible()
    await expect(page.getByText(/Lebenstag 3 · Geburtsgewicht 3\s?400 g/)).toBeVisible()
    await expect(page.getByText('Noch keine Messung.', { exact: false })).toBeVisible()
  })

  test('fällt nach sechs Wochen auf die Perzentilansicht zurück', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('nb3'), code })
    await setUpChild(page, 'Lina', 45)
    await setzeGeburtsgewicht(page, '3400')

    await page.goto('/wachstum')
    await expect(page.getByRole('heading', { name: 'Wachstum' })).toBeVisible()
  })

  test('trägt ein Gewicht in zwei Taps ein und rechnet die Differenz', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('nb4'), code })
    await setUpChild(page, 'Lina', 3)
    await setzeGeburtsgewicht(page, '3400')

    await wiege(page, '3180')

    await expect(page.getByText(/^3\s?180 g$/)).toBeVisible()
    await expect(page.getByText('−220 g')).toBeVisible()
    // 220 von 3400 sind 6,5 Prozent.
    await expect(page.getByText('−6,5 %', { exact: true })).toBeVisible()
  })

  test('bestätigt freundlich, sobald das Geburtsgewicht wieder da ist', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('nb5'), code })
    await setUpChild(page, 'Lina', 9)
    await setzeGeburtsgewicht(page, '3400')

    await wiege(page, '3450')

    await expect(page.getByText('Geburtsgewicht wieder erreicht')).toBeVisible()
    // Danach tritt die Prozentanzeige zurück.
    await expect(page.getByText(/^[+−]\d+,\d+ %$/)).toBeHidden()
  })

  test('bittet sachlich um ein Gespräch mit der Hebamme, ohne zu warnen', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('nb6'), code })
    await setUpChild(page, 'Lina', 4)
    await setzeGeburtsgewicht(page, '3400')

    await wiege(page, '3000') // −11,8 %

    const hinweis = page.getByText(/mehr als 10 % unter dem Geburtsgewicht/)
    await expect(hinweis).toBeVisible()
    await expect(hinweis).toContainText('Das kommt vor')
    await expect(page.getByText('!', { exact: true })).toBeHidden()
  })
})
