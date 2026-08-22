import { test, expect } from '@playwright/test'
import { createHouseholdInvite, register, setUpChild, uniqueEmail } from './helpers'

test.describe('Auswertung und Export', () => {
  test.beforeEach(async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('export'), code })
    await setUpChild(page, 'Lina', 120)

    // Ein paar Einträge, damit es etwas auszuwerten gibt.
    await page.getByRole('button', { name: /^Windel/ }).click()
    await page.getByRole('button', { name: 'Speichern' }).click()
    await page.getByRole('button', { name: /^Schlaf/ }).click()
    await page.getByRole('button', { name: 'Schlaf beenden' }).click()
  })

  test('zeigt Auswertung mit Wochenrückblick', async ({ page }) => {
    await page.goto('/auswertung')
    await expect(page.getByRole('heading', { name: 'Auswertung' })).toBeVisible()
    await expect(page.getByText('Wochenrückblick')).toBeVisible()
    await expect(page.getByText('Schlaf über 30 Tage')).toBeVisible()
  })

  test('wechselt zwischen Tag, Woche und Monat', async ({ page }) => {
    await page.goto('/auswertung')
    await page.getByRole('link', { name: 'Monat', exact: true }).click()
    await expect(page).toHaveURL(/zeitraum=month/)
    await page.getByRole('link', { name: 'Tag', exact: true }).click()
    await expect(page).toHaveURL(/zeitraum=day/)
  })

  test('liefert CSV mit Semikolon und BOM', async ({ page }) => {
    const response = await page.request.get('/api/export/csv?typ=diaper')
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('text/csv')
    const body = await response.text()
    expect(body.charCodeAt(0)).toBe(0xfeff)
    expect(body).toContain('Beginn;Ende;Dauer (Min)')
    expect(body).toContain('Nass')
  })

  test('liefert ein vollständiges JSON-Backup ohne Passwörter', async ({ page }) => {
    const response = await page.request.get('/api/export/json')
    expect(response.status()).toBe(200)
    const backup = await response.json()
    expect(backup.format).toBe('sproessling-backup')
    expect(backup.children).toHaveLength(1)
    expect(backup.events.length).toBeGreaterThan(0)
    // Kein Feld im Backup darf einen Passwort-Hash enthalten.
    expect(JSON.stringify(backup)).not.toContain('passwordHash')
    expect(JSON.stringify(backup)).not.toContain('$argon2')
  })

  test('liefert einen PDF-Wochenbericht', async ({ page }) => {
    const response = await page.request.get('/api/export/pdf')
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('application/pdf')
    const body = await response.body()
    // Jede gültige PDF beginnt mit %PDF-
    expect(body.subarray(0, 5).toString()).toBe('%PDF-')
    expect(body.length).toBeGreaterThan(1000)
  })

  test('weist unbekannte CSV-Kategorien ab', async ({ page }) => {
    const response = await page.request.get('/api/export/csv?typ=quatsch')
    expect(response.status()).toBe(400)
  })
})
