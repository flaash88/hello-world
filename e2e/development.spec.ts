import { test, expect } from '@playwright/test'
import { createHouseholdInvite, register, setUpChild, uniqueEmail } from './helpers'

test.describe('Entwicklung', () => {
  test('zeigt den Wocheninhalt zum Alter des Kindes', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('dev'), code })
    // 20 Wochen alt.
    await setUpChild(page, 'Lina', 140)

    await page.goto('/entwicklung')
    await expect(page.getByRole('heading', { name: 'Entwicklung', exact: true })).toBeVisible()
    await expect(page.getByText(/Lebenswoche 20/)).toBeVisible()

    await page.getByRole('link', { name: /Woche 20/ }).click()
    await expect(page.getByRole('heading', { name: 'Woche für Woche' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Körperliche Entwicklung' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Schlaf in dieser Phase' })).toBeVisible()
  })

  test('zeigt monatsweise gebündelten Inhalt nach Woche 52 mit Hinweis', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('dev2'), code })
    // Etwa 60 Wochen alt – im Bereich der Monatsbündelung.
    await setUpChild(page, 'Lina', 60 * 7)

    await page.goto('/entwicklung/woche')
    await expect(page.getByText(/gilt für Woche \d+ bis \d+/)).toBeVisible()
  })

  test('zeigt ein aktives Sprungfenster', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('dev3'), code })
    // Woche 24 liegt im Sprungfenster 22 bis 26.
    await setUpChild(page, 'Lina', 24 * 7 + 2)

    await page.goto('/entwicklung')
    await expect(page.getByText(/Sprungfenster:/)).toBeVisible()
    await expect(page.getByText('Häufig in dieser Zeit')).toBeVisible()
    // Die Einordnung der Datenlage steht dabei.
    await expect(page.getByText(/wissenschaftlich umstritten/)).toBeVisible()
  })

  test('schlägt eine Übung des Tages vor und markiert sie als gemacht', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('dev4'), code })
    await setUpChild(page, 'Lina', 30 * 7)

    await page.goto('/entwicklung')
    await expect(page.getByText('Übung des Tages')).toBeVisible()
    await page.getByRole('button', { name: 'Als gemacht markieren' }).click()
    await expect(page.getByText('Als gemacht markiert')).toBeVisible()
    await expect(page.getByText('gemacht').first()).toBeVisible()
  })

  test('filtert Übungen nach Bereich', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('dev5'), code })
    await setUpChild(page, 'Lina', 30 * 7)

    await page.goto('/entwicklung/uebungen')
    await expect(page.getByText(/\d+ Übungen/)).toBeVisible()
    await page.getByRole('link', { name: 'Sprache', exact: true }).click()
    await expect(page).toHaveURL(/bereich=sprache/)
    await expect(page.getByText(/\d+ Übung/)).toBeVisible()
  })

  test('hakt einen Meilenstein ab und nimmt ihn zurück', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('dev6'), code })
    await setUpChild(page, 'Lina', 30 * 7)

    await page.goto('/entwicklung/meilensteine')
    await expect(page.getByText(/0 von \d+ abgehakt/)).toBeVisible()

    // Im Tab "Alle" bleibt der Eintrag sichtbar, egal ob abgehakt oder nicht.
    await page.getByRole('tab', { name: 'Alle' }).click()
    await page.getByRole('checkbox', { name: /Frei sitzen abhaken/ }).click()
    await expect(page.getByText('„Frei sitzen“ geschafft')).toBeVisible()
    await expect(page.getByText(/1 von \d+ abgehakt/)).toBeVisible()

    await page.getByRole('checkbox', { name: /Frei sitzen abhaken/ }).click()
    await expect(page.getByText(/0 von \d+ abgehakt/)).toBeVisible()
  })

  test('legt einen eigenen Meilenstein an', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('dev7'), code })
    await setUpChild(page, 'Lina', 30 * 7)

    await page.goto('/entwicklung/meilensteine')
    await page.getByRole('button', { name: 'Eigenen Meilenstein anlegen' }).click()
    await page.getByLabel('Was war es?').fill('Erstes Mal am Meer')
    await page.getByRole('button', { name: 'Speichern' }).click()

    await expect(page.getByText('Eigene Meilensteine')).toBeVisible()
    await expect(page.getByText('Erstes Mal am Meer')).toBeVisible()
  })
})
