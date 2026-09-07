import { test, expect } from '@playwright/test'

import { createHouseholdInvite, PASSWORD, uniqueEmail } from './helpers'

const EMAIL = uniqueEmail('auth')
let CODE = ''

test.beforeAll(async () => {
  CODE = await createHouseholdInvite('Anmeldetest')
})

test.describe('Anmeldung', () => {
  test('ohne Session landet man auf der Anmeldeseite', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: 'Sprössling' })).toBeVisible()
  })

  test('Registrierung mit Einladungscode, Abmelden und erneutes Anmelden', async ({ page }) => {
    await page.goto('/register')
    await page.getByLabel('Einladungscode').fill(CODE)
    await page.getByLabel('Dein Name').fill('Mama')
    await page.getByLabel('E-Mail').fill(EMAIL)
    await page.getByLabel('Passwort', { exact: true }).fill(PASSWORD)
    await page.getByLabel('Passwort wiederholen').fill(PASSWORD)
    await page.getByRole('button', { name: 'Konto anlegen' }).click()

    // Beim ersten Start steht die Erklaerung zum Protokollmodus davor.
    await expect(page).toHaveURL(/\/willkommen$/)
    await page.getByRole('button', { name: 'Kind oder Schwangerschaft anlegen' }).click()
    await expect(page).toHaveURL(/\/onboarding$/)
    await expect(page.getByRole('heading', { name: 'Kurz vorweg' })).toBeVisible()

    await page.goto('/mehr')
    await page.getByRole('button', { name: 'Abmelden' }).click()
    await expect(page).toHaveURL(/\/login$/)

    await page.getByLabel('E-Mail').fill(EMAIL)
    await page.getByLabel('Passwort').fill(PASSWORD)
    await page.getByRole('button', { name: 'Anmelden' }).click()
    await expect(page.getByRole('heading', { name: 'Hallo Mama!' })).toBeVisible()
  })

  test('falsches Passwort wird abgewiesen', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('E-Mail').fill(EMAIL)
    await page.getByLabel('Passwort').fill('falsch-falsch-falsch')
    await page.getByRole('button', { name: 'Anmelden' }).click()
    await expect(page.getByTestId('form-error')).toContainText('stimmt nicht')
  })

  test('verbrauchter Einladungscode wird abgewiesen', async ({ page }) => {
    await page.goto('/register')
    await page.getByLabel('Einladungscode').fill(CODE)
    await page.getByLabel('Dein Name').fill('Papa')
    await page.getByLabel('E-Mail').fill(uniqueEmail('papa'))
    await page.getByLabel('Passwort', { exact: true }).fill(PASSWORD)
    await page.getByLabel('Passwort wiederholen').fill(PASSWORD)
    await page.getByRole('button', { name: 'Konto anlegen' }).click()
    await expect(page.getByTestId('form-error')).toContainText('ungültig')
  })
})
