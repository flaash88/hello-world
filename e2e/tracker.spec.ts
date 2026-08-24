import { test, expect } from '@playwright/test'
import { createHouseholdInvite, register, setUpChild, uniqueEmail } from './helpers'

test.describe('Tracker', () => {
  test.beforeEach(async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('tracker'), code })
    await setUpChild(page, 'Lina', 60)
  })

  test('Schlaf-Timer startet mit einem Tap und bleibt über Navigation sichtbar', async ({ page }) => {
    await page.getByRole('button', { name: /^Schlaf/ }).click()
    const bar = page.getByRole('button', { name: 'Schlaf beenden' })
    await expect(bar).toBeVisible()

    // Die Leiste überlebt Navigation und Reload – der Zustand liegt am Server.
    await page.goto('/verlauf')
    await expect(page.getByRole('button', { name: 'Schlaf beenden' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('button', { name: 'Schlaf beenden' })).toBeVisible()

    await page.getByRole('button', { name: 'Schlaf beenden' }).click()
    await expect(page.getByRole('button', { name: 'Schlaf beenden' })).toHaveCount(0)
  })

  test('Timer lässt sich pausieren und fortsetzen', async ({ page }) => {
    await page.getByRole('button', { name: /^Stillen/ }).click()
    await expect(page.getByRole('button', { name: 'Stillen beenden' })).toBeVisible()

    await page.getByRole('button', { name: 'Timer pausieren' }).click()
    await expect(page.getByText('· pausiert')).toBeVisible()

    await page.getByRole('button', { name: 'Timer fortsetzen' }).click()
    await expect(page.getByText('· pausiert')).toHaveCount(0)
  })

  test('Windel-Eintrag in zwei Taps ab Startbildschirm', async ({ page }) => {
    await page.getByRole('button', { name: /^Windel/ }).click()
    await page.getByRole('button', { name: 'Speichern' }).click()

    await expect(page.getByTestId('event-list').getByText('Windel · Nass').first()).toBeVisible()
  })

  test('Windel mit Stuhlangaben zeigt Farbe und Konsistenz', async ({ page }) => {
    await page.getByRole('button', { name: /^Windel/ }).click()
    await page.getByRole('button', { name: /^Voll/ }).click()
    await page.getByRole('button', { name: /Senfgelb/ }).click()
    await page.getByRole('button', { name: /Körnig/ }).click()
    await page.getByRole('button', { name: 'Speichern' }).click()

    await expect(page.getByTestId('event-list').getByText('Senfgelb · Körnig').first()).toBeVisible()
  })

  test('Beikost merkt sich Lebensmittel als Vorschlag', async ({ page }) => {
    await page.getByRole('button', { name: 'Etwas anderes eintragen' }).click()
    await page.getByRole('button', { name: 'Beikost' }).click()
    await page.getByLabel('Lebensmittel').fill('Pastinake')
    await page.getByRole('button', { name: 'Hinzu' }).click()
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByTestId('event-list').getByText('Pastinake').first()).toBeVisible()

    // Beim nächsten Mal steht das Lebensmittel als Vorschlag bereit.
    await page.getByRole('button', { name: 'Etwas anderes eintragen' }).click()
    await page.getByRole('button', { name: 'Beikost' }).click()
    await expect(page.getByText('Zuletzt:')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Pastinake', exact: true })).toBeVisible()
  })

  test('Eintrag lässt sich bearbeiten und wieder löschen', async ({ page }) => {
    await page.getByRole('button', { name: /^Windel/ }).click()
    await page.getByRole('button', { name: 'Speichern' }).click()

    await page.getByRole('button', { name: /Windel · Nass/ }).first().click()
    await page.getByLabel('Notiz').fill('Vor dem Schlafen')
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByTestId('event-list').getByText('Vor dem Schlafen').first()).toBeVisible()

    await page.getByRole('button', { name: /Windel · Nass/ }).first().click()
    await page.getByRole('button', { name: 'Eintrag löschen' }).click()
    await expect(page.getByText('Gelöscht')).toBeVisible()
    await expect(page.getByTestId('event-list').getByText('Vor dem Schlafen')).toHaveCount(0)
  })

  test('Ende vor Beginn wird abgelehnt', async ({ page }) => {
    await page.getByRole('button', { name: 'Etwas anderes eintragen' }).click()
    await page.getByRole('button', { name: 'Abpumpen' }).click()
    await page.getByLabel('Beginn').fill('2026-01-02T10:00')
    await page.getByLabel('Ende').fill('2026-01-02T09:00')
    await page.getByRole('button', { name: 'Speichern' }).click()

    await expect(page.getByTestId('form-error')).toContainText('Ende darf nicht vor dem Beginn')
  })

  test('Verlauf filtert nach Art', async ({ page }) => {
    await page.getByRole('button', { name: /^Windel/ }).click()
    await page.getByRole('button', { name: 'Speichern' }).click()

    await page.goto('/verlauf?typ=sleep')
    await expect(page.getByText('Für Schlaf gibt es noch keine Einträge.')).toBeVisible()

    await page.goto('/verlauf?typ=diaper')
    await expect(page.getByTestId('event-list').getByText('Windel · Nass').first()).toBeVisible()
  })
})

test.describe('Zahleneingabe', () => {
  test.beforeEach(async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('stepper'), code })
    await setUpChild(page, 'Lina', 120)
    await page.goto('/heute')
    await page.getByRole('button', { name: 'Etwas anderes eintragen' }).click()
    await page.getByRole('button', { name: 'Gesundheit', exact: true }).click()
  })

  test('nimmt eine getippte Temperatur so, wie sie getippt wurde', async ({ page }) => {
    // Der Fehler: Nach der ersten Ziffer wurde die 3 auf das Minimum 30
    // hochgezogen, die zweite machte daraus 308 und damit das Maximum 45.
    const feld = page.getByRole('textbox', { name: /^Temperatur/ })
    await feld.click()
    await feld.pressSequentially('38')
    await expect(feld).toHaveValue('38')

    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByTestId('event-list').getByText(/38,0 °C/).first()).toBeVisible()
  })

  test('begrenzt erst beim Verlassen des Feldes', async ({ page }) => {
    const feld = page.getByRole('textbox', { name: /^Temperatur/ })
    await feld.click()
    await feld.pressSequentially('99')
    await feld.blur()
    await expect(feld).toHaveValue('45')
  })

  test('lässt die Zahl beim Halten weiterlaufen', async ({ page }) => {
    const feld = page.getByRole('textbox', { name: /^Temperatur/ })
    await feld.click()
    await feld.fill('37')
    await feld.blur()

    const plus = page.getByRole('button', { name: 'Temperatur erhöhen' })
    await plus.hover()
    await page.mouse.down()
    await page.waitForTimeout(1500)
    await page.mouse.up()

    // Ein einzelner Tap gäbe 37,1. Gehalten muss deutlich mehr herauskommen,
    // sonst braucht 36 auf 40 Grad vierzig Taps.
    const wert = Number((await feld.inputValue()).replace(',', '.'))
    expect(wert).toBeGreaterThan(38)
  })
})
