import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test, expect, type Page } from '@playwright/test'
import { createHouseholdInvite, register, setUpChild, uniqueEmail } from './helpers'

const HIER = path.dirname(fileURLToPath(import.meta.url))
const TESTTON = path.join(HIER, 'fixtures', 'testton.wav')

async function ladeHoch(page: Page) {
  await page.getByLabel('Audiodatei auswählen').setInputFiles(TESTTON)
  await expect(page.getByTestId('ton-liste')).toBeVisible()
}

test.describe('Töne', () => {
  test.beforeEach(async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('ton'), code })
    await setUpChild(page, 'Lina', 120)
    await page.goto('/tagebuch/toene')
  })

  test('ist leer, bis die erste Aufnahme da ist', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Töne' })).toBeVisible()
    await expect(page.getByText('Noch keine Aufnahme')).toBeVisible()
    // Ohne Klick auf „Aufnehmen" wird das Mikrofon gar nicht erst angefragt.
    await expect(page.getByRole('button', { name: 'Aufnahme starten' })).toBeHidden()
  })

  test('fragt das Mikrofon erst beim Aufnehmen an', async ({ page }) => {
    await page.getByRole('button', { name: 'Aufnehmen' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Aufnahme starten' })).toBeVisible()
    await expect(page.getByText(/Höchstens 3 Minuten/)).toBeVisible()
  })

  test('nimmt eine hochgeladene Datei an und wandelt sie nach Opus um', async ({ page }) => {
    await ladeHoch(page)

    const eintrag = page.getByTestId('ton-liste').getByRole('listitem').first()
    await expect(eintrag.getByText('testton')).toBeVisible()
    // Zwei Sekunden Sinus, als Opus deutlich kleiner als das WAV.
    await expect(eintrag.getByText(/· 0:0[12] ·/)).toBeVisible()

    // Der Player hängt an /api/uploads und liefert Ogg aus.
    const src = await eintrag.locator('audio').getAttribute('src')
    expect(src).toMatch(/^\/api\/uploads\/audio\//)
    const antwort = await page.request.get(src!)
    expect(antwort.status()).toBe(200)
    expect(antwort.headers()['content-type']).toBe('audio/ogg')
    expect(Number(antwort.headers()['content-length'])).toBeLessThan(64078)
  })

  test('zeichnet eine Wellenform', async ({ page }) => {
    await ladeHoch(page)
    await expect(page.getByRole('slider', { name: /Wellenform von testton/ })).toBeVisible()
  })

  test('vergibt Schlagworte und filtert danach', async ({ page }) => {
    await ladeHoch(page)

    await page.getByRole('button', { name: 'Bearbeiten' }).first().click()
    await page.getByRole('dialog').getByLabel('Titel').fill('Erstes Lachen')
    await page.getByRole('button', { name: 'Lachen', exact: true }).click()
    await page.getByRole('button', { name: 'Speichern' }).click()

    await expect(page.getByText('Erstes Lachen')).toBeVisible()

    // Filter nach dem Schlagwort behält den Eintrag, ein anderer Text nicht.
    await page.getByRole('button', { name: 'Lachen' }).first().click()
    await expect(page.getByTestId('ton-liste').getByRole('listitem')).toHaveCount(1)

    await page.getByRole('textbox', { name: 'Nach Titel suchen' }).fill('Brabbeln')
    await expect(page.getByText('Zu diesem Filter gibt es nichts.')).toBeVisible()
  })

  test('verknüpft eine Aufnahme mit einem Meilenstein', async ({ page }) => {
    // Erst einen Meilenstein abhaken, damit es etwas zu verknüpfen gibt.
    await page.goto('/entwicklung/meilensteine')
    await page.getByRole('checkbox', { name: /abhaken/ }).first().click()
    await expect(page.getByText(/geschafft/).first()).toBeVisible()

    await page.goto('/tagebuch/toene')
    await ladeHoch(page)

    await page.getByRole('button', { name: 'Bearbeiten' }).first().click()
    await page.getByLabel('Zu einem Meilenstein').click()
    await page.getByRole('option').nth(1).click()
    await page.getByRole('button', { name: 'Speichern' }).click()

    await expect(page.getByTestId('ton-liste').getByRole('listitem').first()).toContainText(
      /Lächelt|Hebt|Dreht|Erstes/,
    )
  })

  test('löscht eine Aufnahme samt Datei', async ({ page }) => {
    await ladeHoch(page)
    const src = await page.locator('audio').first().getAttribute('src')

    await page.getByRole('button', { name: 'Bearbeiten' }).first().click()
    await page.getByRole('button', { name: 'Aufnahme löschen' }).click()

    await expect(page.getByText('Noch keine Aufnahme')).toBeVisible()
    expect((await page.request.get(src!)).status()).toBe(404)
  })

  test('taucht im Jahresrückblick auf', async ({ page }) => {
    await ladeHoch(page)

    await page.goto('/tagebuch/rueckblick')
    await expect(page.getByRole('heading', { name: /Wie Lina geklungen hat/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /testton/ })).toBeVisible()
  })

  test('ist vom Tagebuch aus erreichbar', async ({ page }) => {
    await page.goto('/tagebuch')
    await page.getByRole('link', { name: 'Töne' }).click()
    await expect(page.getByRole('heading', { name: 'Töne' })).toBeVisible()
  })
})
