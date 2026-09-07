import { test, expect } from '@playwright/test'
import {
  apiTokenFor,
  createHouseholdInvite,
  register,
  setUpChild,
  uniqueEmail,
} from './helpers'

/** Registriert ein Kind und liefert einen frischen API-Token dazu. */
async function setup(page: Parameters<typeof register>[0], praefix: string) {
  const code = await createHouseholdInvite()
  const email = uniqueEmail(praefix)
  await register(page, { name: 'Mama', email, code })
  await setUpChild(page, 'Lina', 30)
  return { email, token: await apiTokenFor(email) }
}

test.describe('API v1', () => {
  test('weist Anfragen ohne Token ab', async ({ page, request }) => {
    await setup(page, 'api1')

    const ohne = await request.get('/api/v1/status')
    expect(ohne.status()).toBe(401)

    const falsch = await request.get('/api/v1/status', {
      headers: { Authorization: 'Bearer sp_gibtesnicht' },
    })
    expect(falsch.status()).toBe(401)
  })

  test('nimmt keine Session-Cookies an', async ({ page, context }) => {
    await setup(page, 'api2')
    // Der Browser ist angemeldet – für die API zählt das nicht.
    const antwort = await context.request.get('/api/v1/status')
    expect(antwort.status()).toBe(401)
  })

  test('legt eine Windel an, so wie es ein NFC-Tag schickt', async ({ page, request }) => {
    const { token } = await setup(page, 'api3')

    const antwort = await request.post('/api/v1/events', {
      headers: { Authorization: `Bearer ${token}` },
      data: { type: 'diaper', wet: true, soiled: false },
    })
    expect(antwort.status()).toBe(201)
    const body = await antwort.json()
    expect(body.type).toBe('diaper')
    expect(body.id).toBeTruthy()

    // Der Eintrag steht in der App und ist als Automation gekennzeichnet.
    await page.goto('/verlauf')
    await expect(page.getByText('Automation').first()).toBeVisible()
  })

  test('kennt die in Phase 9 dazugekommenen Typen', async ({ page, request }) => {
    const { token } = await setup(page, 'api4')

    const temperatur = await request.post('/api/v1/events', {
      headers: { Authorization: `Bearer ${token}` },
      data: { type: 'temperature', temperatureC: 38.4, measuredAt: 'ear' },
    })
    expect(temperatur.status()).toBe(201)

    const medikament = await request.post('/api/v1/events', {
      headers: { Authorization: `Bearer ${token}` },
      data: { type: 'medication', medication: 'Nurofen', doseMl: 4, repeatHours: 6 },
    })
    expect(medikament.status()).toBe(201)

    // Beide landen in der Fieberansicht.
    await page.goto('/gesundheit/fieber')
    await expect(page.getByRole('heading', { name: 'Fieberverlauf' })).toBeVisible()
  })

  test('weist einen unbekannten Typ ab und sagt, was es gibt', async ({ page, request }) => {
    const { token } = await setup(page, 'api5')

    const antwort = await request.post('/api/v1/events', {
      headers: { Authorization: `Bearer ${token}` },
      data: { type: 'kaffee' },
    })
    expect(antwort.status()).toBe(400)
    const body = await antwort.json()
    expect(body.erlaubt).toContain('diaper')
    expect(body.erlaubt).toContain('temperature')
  })

  test('liefert den Zustand für Sensoren', async ({ page, request }) => {
    const { token } = await setup(page, 'api6')
    const auth = { Authorization: `Bearer ${token}` }

    await request.post('/api/v1/events', { headers: auth, data: { type: 'diaper', wet: true } })

    const antwort = await request.get('/api/v1/status', { headers: auth })
    expect(antwort.status()).toBe(200)
    const body = await antwort.json()
    expect(body.kind.name).toBe('Lina')
    expect(body.windelnHeute).toBe(1)
    expect(body.fieber.aktiv).toBe(false)
    expect(body).toHaveProperty('naechstesSchlaffenster')
    expect(body).toHaveProperty('wachSeitMinuten')
  })

  test('startet und beendet einen Timer, aber nicht zweimal', async ({ page, request }) => {
    const { token } = await setup(page, 'api7')
    const auth = { Authorization: `Bearer ${token}` }

    const start = await request.post('/api/v1/timer/sleep/start', { headers: auth })
    expect(start.status()).toBe(201)

    const zweiterStart = await request.post('/api/v1/timer/sleep/start', { headers: auth })
    expect(zweiterStart.status()).toBe(409)

    const stop = await request.post('/api/v1/timer/sleep/stop', { headers: auth })
    expect(stop.status()).toBe(200)

    const zweiterStop = await request.post('/api/v1/timer/sleep/stop', { headers: auth })
    expect(zweiterStop.status()).toBe(409)
  })

  test('lehnt einen Timer für eine Kategorie ohne Timer ab', async ({ page, request }) => {
    const { token } = await setup(page, 'api8')
    const antwort = await request.post('/api/v1/timer/diaper/start', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(antwort.status()).toBe(400)
  })

  test('widerrufene Tokens funktionieren nicht mehr', async ({ page, request }) => {
    const { token } = await setup(page, 'api9')
    const auth = { Authorization: `Bearer ${token}` }
    expect((await request.get('/api/v1/status', { headers: auth })).status()).toBe(200)

    await page.goto('/mehr/integrationen')
    await page.getByRole('button', { name: /E2E widerrufen/ }).click()
    await expect(page.getByText('Token widerrufen')).toBeVisible()

    expect((await request.get('/api/v1/status', { headers: auth })).status()).toBe(401)
  })

  test('schreibt jeden Zugriff ins Protokoll', async ({ page, request }) => {
    const { token } = await setup(page, 'api10')
    await request.get('/api/v1/status', { headers: { Authorization: `Bearer ${token}` } })

    await page.goto('/mehr/integrationen')
    await expect(page.getByText('GET /api/v1/status → 200')).toBeVisible()
    await expect(page.getByText(/zuletzt/).first()).toBeVisible()
  })
})

test.describe('Automationen einrichten', () => {
  test('legt einen Token an und zeigt ihn genau einmal', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('api11'), code })
    await setUpChild(page, 'Lina', 30)

    await page.goto('/mehr/integrationen')
    await page.getByLabel('Name des Tokens').fill('Home Assistant')
    await page.getByRole('button', { name: 'Anlegen' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText(/^sp_/)).toBeVisible()
    await dialog.getByRole('button', { name: 'Fertig' }).click()

    // Danach steht er nirgends mehr im Klartext.
    await expect(page.getByText('Home Assistant', { exact: true })).toBeVisible()
    await expect(page.getByText(/^sp_/)).toHaveCount(0)
    await expect(page.getByText('noch nie benutzt')).toBeVisible()
  })

  test('nimmt einen Webhook nur mit vollständiger Adresse', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('api12'), code })
    await setUpChild(page, 'Lina', 30)

    await page.goto('/mehr/integrationen')
    await page.getByRole('button', { name: 'Webhook hinzufügen' }).click()
    await page.getByLabel('Adresse').fill('homeassistant.local')
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByTestId('form-error')).toContainText('http://')

    await page.getByLabel('Adresse').fill('http://homeassistant.local:8123/api/webhook/sp')
    await page.getByRole('button', { name: 'diaper' }).click()
    await page.getByRole('button', { name: 'Speichern' }).click()

    await expect(page.getByRole('dialog')).toBeHidden()
    const liste = page.locator('main')
    await expect(liste.getByText('http://homeassistant.local:8123/api/webhook/sp')).toBeVisible()
    await expect(liste.getByText('diaper', { exact: true })).toBeVisible()
  })
})
