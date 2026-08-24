import { test, expect } from '@playwright/test'
import { createHouseholdInvite, register, setUpChild, uniqueEmail } from './helpers'

test.describe('Tagebuch', () => {
  test.beforeEach(async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('journal'), code })
    await setUpChild(page, 'Lina', 200)
  })

  test('schreibt einen Eintrag und zeigt ihn in der Zeitleiste', async ({ page }) => {
    await page.goto('/tagebuch')
    await expect(page.getByText('Noch nichts aufgeschrieben')).toBeVisible()

    await page.getByRole('button', { name: 'Eintrag schreiben' }).click()
    await page.getByLabel('Überschrift (optional)').fill('Erstes Lachen')
    await page.getByLabel('Was ist passiert?').fill('Heute hat sie zum ersten Mal richtig gelacht.')
    await page.getByPlaceholder('Neue Schlagwörter').fill('Meilenstein, lustig')
    await page.getByRole('button', { name: 'Speichern' }).click()

    await expect(page.getByRole('heading', { name: 'Erstes Lachen' })).toBeVisible()
    await expect(page.getByText('Heute hat sie zum ersten Mal richtig gelacht.')).toBeVisible()
    // Das Schlagwort erscheint sowohl am Eintrag als auch im Filter.
    await expect(page.getByText('Meilenstein', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Meilenstein' })).toBeVisible()
  })

  test('lädt ein Foto hoch, entfernt EXIF und zeigt es an', async ({ page }) => {
    await page.goto('/tagebuch')
    await page.getByRole('button', { name: 'Eintrag schreiben' }).click()

    // Ein kleines JPEG mit EXIF-Aufnahmedatum erzeugen.
    await page.getByLabel('Fotos auswählen').setInputFiles({
      name: 'test.jpg',
      mimeType: 'image/jpeg',
      buffer: await buildJpegWithExif(),
    })

    await expect(page.getByRole('button', { name: 'Foto entfernen' })).toBeVisible({ timeout: 20_000 })
    await page.getByLabel('Was ist passiert?').fill('Mit Foto.')
    await page.getByRole('button', { name: 'Speichern' }).click()

    await expect(page.getByText('Mit Foto.')).toBeVisible()

    // Das ausgelieferte Bild ist webp und enthält keine EXIF-Daten mehr.
    const src = await page.locator('main img').first().getAttribute('src')
    const response = await page.request.get(src!)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toBe('image/webp')
    const body = await response.body()
    expect(body.subarray(0, 4).toString()).toBe('RIFF')
    expect(body.includes(Buffer.from('2019:03:14'))).toBe(false)
  })

  test('weist Dateien ab, die keine Bilder sind', async ({ page }) => {
    await page.goto('/tagebuch')
    await page.getByRole('button', { name: 'Eintrag schreiben' }).click()

    await page.getByLabel('Fotos auswählen').setInputFiles({
      name: 'gefaelscht.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('Das ist in Wahrheit Text, kein Bild.'),
    })

    // Die Meldung nennt seit Phase 12 die Datei und den Grund, statt nur zu
    // zaehlen, wie viele abgelehnt wurden.
    await expect(page.getByText('Nicht hochgeladen')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(/gefaelscht\.jpg: .*kein lesbares Bild/)).toBeVisible()
  })

  test('markiert ein Monatsfoto und zeigt es in der Galerie', async ({ page }) => {
    await page.goto('/tagebuch')
    await page.getByRole('button', { name: 'Eintrag schreiben' }).click()
    await page.getByLabel('Was ist passiert?').fill('Der Monatsschnappschuss.')
    await page.getByLabel(/Als Monatsfoto für Monat/).check()
    await page.getByRole('button', { name: 'Speichern' }).click()

    await expect(page.getByText(/Monatsfoto \d/)).toBeVisible()

    await page.goto('/tagebuch/monatsfotos')
    await expect(page.getByRole('heading', { name: 'Monatsfotos' })).toBeVisible()
  })

  test('zeigt den Jahresrückblick mit Zahlen', async ({ page }) => {
    await page.goto('/tagebuch')
    await page.getByRole('button', { name: 'Eintrag schreiben' }).click()
    await page.getByLabel('Was ist passiert?').fill('Ein Eintrag fürs Jahr.')
    await page.getByRole('button', { name: 'Speichern' }).click()

    await page.goto('/tagebuch/rueckblick')
    await expect(page.getByText('Das Jahr in Zahlen')).toBeVisible()
    await expect(page.getByText('Tagebucheinträge')).toBeVisible()
    await expect(page.getByText('Ein Eintrag fürs Jahr.')).toBeVisible()
  })

  test('Bilder sind ohne Anmeldung nicht abrufbar', async ({ page, browser }) => {
    await page.goto('/tagebuch')
    await page.getByRole('button', { name: 'Eintrag schreiben' }).click()
    await page.getByLabel('Fotos auswählen').setInputFiles({
      name: 'test.jpg',
      mimeType: 'image/jpeg',
      buffer: await buildJpegWithExif(),
    })
    await expect(page.getByRole('button', { name: 'Foto entfernen' })).toBeVisible({ timeout: 20_000 })
    await page.getByLabel('Was ist passiert?').fill('Privat.')
    await page.getByRole('button', { name: 'Speichern' }).click()

    const src = await page.locator('main img').first().getAttribute('src')

    const anonymous = await browser.newContext()
    const response = await anonymous.request.get(`http://127.0.0.1:${process.env.E2E_PORT ?? 3100}${src}`)
    expect(response.status()).toBe(401)
    await anonymous.close()
  })
})

/** Erzeugt ein winziges JPEG mit EXIF-Aufnahmedatum über sharp. */
async function buildJpegWithExif(): Promise<Buffer> {
  const sharp = (await import('sharp')).default
  const base = await sharp({
    create: { width: 64, height: 64, channels: 3, background: { r: 200, g: 120, b: 80 } },
  })
    .jpeg()
    .toBuffer()

  return sharp(base)
    .withMetadata({
      exif: { IFD0: { DateTime: '2019:03:14 10:11:12' }, IFD2: { DateTimeOriginal: '2019:03:14 10:11:12' } },
    })
    .jpeg()
    .toBuffer()
}
