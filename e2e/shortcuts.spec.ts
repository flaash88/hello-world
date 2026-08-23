import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'
import { createHouseholdInvite, register, setUpChild, uniqueEmail } from './helpers'

test.describe('Manifest', () => {
  test('führt alle Verknüpfungen auf existierende Seiten', async ({ page, request }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('sc'), code })
    await setUpChild(page, 'Lina', 30)

    const manifest = await (await request.get('/manifest.webmanifest')).json()

    expect(manifest.shortcuts).toHaveLength(4)
    expect(manifest.shortcuts.map((s: { url: string }) => s.url)).toEqual([
      '/heute?action=sleep-start',
      '/heute?action=nursing-start',
      '/heute?action=diaper',
      '/notfall',
    ])

    // Jede Verknüpfung hat ein eigenes Icon, und das Icon gibt es auch.
    for (const shortcut of manifest.shortcuts) {
      expect(shortcut.icons?.[0]?.src, shortcut.name).toBeTruthy()
      const antwort = await request.get(shortcut.icons[0].src)
      expect(antwort.status(), shortcut.icons[0].src).toBe(200)
    }

    // Und jede Zieladresse führt wirklich irgendwohin.
    for (const shortcut of manifest.shortcuts) {
      await page.goto(shortcut.url)
      await expect(page.locator('h1')).toBeVisible()
    }
  })

  test('meldet ein Share Target für Bilder und Ton an', async ({ request }) => {
    const manifest = await (await request.get('/manifest.webmanifest')).json()
    expect(manifest.share_target.action).toBe('/api/share')
    expect(manifest.share_target.method).toBe('POST')
    expect(manifest.share_target.enctype).toBe('multipart/form-data')

    const accept = manifest.share_target.params.files.flatMap((f: { accept: string[] }) => f.accept)
    expect(accept).toContain('image/*')
    expect(accept).toContain('audio/*')
  })
})

test.describe('Verknüpfungen', () => {
  test.beforeEach(async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('sc2'), code })
    await setUpChild(page, 'Lina', 30)
  })

  test('startet den Schlaf-Timer und räumt den Parameter weg', async ({ page }) => {
    await page.goto('/heute?action=sleep-start')

    await expect(page.getByText('Schlaf läuft')).toBeVisible()
    // Der Parameter ist weg, damit ein Neuladen nichts doppelt startet.
    await expect(page).toHaveURL(/\/heute$/)

    // Nach dem Neuladen läuft genau ein Timer weiter – kein zweiter Block.
    await page.reload()
    await expect(page.getByRole('button', { name: 'Schlaf beenden' })).toHaveCount(1)
  })

  test('startet keinen zweiten Timer derselben Art', async ({ page }) => {
    await page.goto('/heute?action=sleep-start')
    await expect(page.getByText('Schlaf läuft')).toBeVisible()

    await page.goto('/heute?action=sleep-start')
    await expect(page.getByText('Schlaf läuft bereits')).toBeVisible()
  })

  test('öffnet für die Windel das Eingabeblatt', async ({ page }) => {
    await page.goto('/heute?action=diaper')
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page).toHaveURL(/\/heute$/)
  })

  test('ignoriert eine unbekannte Aktion', async ({ page }) => {
    await page.goto('/heute?action=quatsch')
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page.getByRole('heading', { name: /^Hallo/ })).toBeVisible()
  })
})

test.describe('Share Target', () => {
  test('nimmt ein geteiltes Bild an und hängt es an den neuen Eintrag', async ({ page, context }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('sc3'), code })
    await setUpChild(page, 'Lina', 30)

    // Ein winziges PNG, so wie es der Browser beim Teilen schicken würde.
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    )

    const antwort = await context.request.post('/api/share', {
      multipart: {
        title: 'Geteilt vom Handy',
        media: { name: 'foto.png', mimeType: 'image/png', buffer: png },
      },
      maxRedirects: 0,
    })
    expect(antwort.status()).toBe(303)
    const ziel = antwort.headers()['location']
    expect(ziel).toContain('/tagebuch?geteilt=')

    await page.goto(ziel!)
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog').getByRole('img').first()).toBeVisible()
    await expect(page.getByLabel('Überschrift (optional)')).toHaveValue('Geteilt vom Handy')
  })

  test('schickt ein geteiltes Tonstück ins Tonarchiv', async ({ page, context }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('sc4'), code })
    await setUpChild(page, 'Lina', 30)

    const antwort = await context.request.post('/api/share', {
      multipart: {
        media: {
          name: 'testton.wav',
          mimeType: 'audio/wav',
          buffer: readFileSync('e2e/fixtures/testton.wav'),
        },
      },
      maxRedirects: 0,
    })
    expect(antwort.status()).toBe(303)
    expect(antwort.headers()['location']).toContain('/tagebuch/toene')

    await page.goto('/tagebuch/toene')
    await expect(page.getByTestId('ton-liste').getByText('testton')).toBeVisible()
  })
})
