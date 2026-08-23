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
    // Bewusst kein Zähler „x von y abgehakt“ – siehe Phase 11.
    await expect(page.getByText(/abgehakt/)).toHaveCount(0)

    // Im Tab "Alle" bleibt der Eintrag sichtbar, egal ob abgehakt oder nicht.
    await page.getByRole('tab', { name: 'Alle' }).click()
    await page.getByRole('checkbox', { name: /Frei sitzen abhaken/ }).click()
    await expect(page.getByText('„Frei sitzen“ eingetragen')).toBeVisible()
    await expect(page.getByRole('checkbox', { name: /Frei sitzen abhaken/ })).toBeChecked()

    await page.getByRole('checkbox', { name: /Frei sitzen abhaken/ }).click()
    await expect(page.getByRole('checkbox', { name: /Frei sitzen abhaken/ })).not.toBeChecked()
  })

  test('ergänzt einen Meilenstein um Datum, Notiz und Foto', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('dev8'), code })
    await setUpChild(page, 'Lina', 30 * 7)

    await page.goto('/entwicklung/meilensteine')
    await page.getByRole('tab', { name: 'Alle' }).click()
    await page.getByRole('checkbox', { name: /Frei sitzen abhaken/ }).click()
    await expect(page.getByRole('checkbox', { name: /Frei sitzen abhaken/ })).toBeChecked()

    await page.getByRole('button', { name: /Frei sitzen bearbeiten/ }).click()
    await page.getByLabel('Wann war das?').fill('2026-05-04')
    await page.getByLabel('Notiz').fill('Auf der Picknickdecke im Garten.')
    await page.getByLabel('Fotos auswählen').setInputFiles({
      name: 'sitzen.jpg',
      mimeType: 'image/jpeg',
      buffer: await buildJpeg(),
    })
    await expect(page.getByRole('button', { name: 'Foto entfernen' })).toBeVisible({ timeout: 20_000 })
    await page.getByRole('button', { name: 'Speichern' }).click()

    await expect(page.getByText('Auf der Picknickdecke im Garten.')).toBeVisible()
    await expect(page.locator('main img').first()).toBeVisible()
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

/** Kleines JPEG als Testfoto. */
async function buildJpeg(): Promise<Buffer> {
  const sharp = (await import('sharp')).default
  return sharp({
    create: { width: 64, height: 64, channels: 3, background: { r: 120, g: 160, b: 90 } },
  })
    .jpeg()
    .toBuffer()
}
