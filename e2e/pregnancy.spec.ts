import { test, expect } from '@playwright/test'
import { createHouseholdInvite, register, setUpPregnancy, uniqueEmail } from './helpers'

// Etwa SSW 30: 70 Tage bis zum errechneten Termin.
const DUE_IN_DAYS = 70

test.describe('Schwangerschaft', () => {
  test.beforeEach(async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('ssw'), code })
    await setUpPregnancy(page, DUE_IN_DAYS)
  })

  test('zeigt SSW, Countdown und Wocheninhalt', async ({ page }) => {
    await expect(page.getByText(/SSW \d+\+\d/)).toBeVisible()
    // Der Countdown rechnet in Ortszeit, das Testdatum entsteht in UTC –
    // je nach Uhrzeit unterscheidet sich das um einen Tag.
    await expect(
      page.getByText(new RegExp(`noch (${DUE_IN_DAYS}|${DUE_IN_DAYS - 1}) Tage`)),
    ).toBeVisible()

    await page.goto('/schwangerschaft')
    await expect(page.getByRole('heading', { name: 'Diese Woche' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Beim Baby' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Für den Partner' })).toBeVisible()
  })

  test('Wehen-Timer zeichnet auf und wertet 4-1-1 aus', async ({ page }) => {
    await page.goto('/schwangerschaft/wehen')
    await expect(page.getByText('Noch keine abgeschlossene Wehe aufgezeichnet.')).toBeVisible()

    await page.getByRole('button', { name: 'Wehe starten' }).click()
    await expect(page.getByRole('button', { name: /Wehe beenden/ })).toBeVisible()
    await page.getByRole('button', { name: /Wehe beenden/ }).click()

    await expect(page.getByText(/1 abgeschlossene Wehe/)).toBeVisible()
    // Eine einzelne kurze Wehe darf niemals als 4-1-1 durchgehen.
    await expect(page.getByText('Noch nicht im 4-1-1-Muster')).toBeVisible()
  })

  test('Kindsbewegungen werden gezählt', async ({ page }) => {
    await page.goto('/schwangerschaft/bewegungen')
    const button = page.getByRole('button', { name: /Bewegung zählen/ })
    await expect(page.getByText('Der erste Tritt startet die Zählung.')).toBeVisible()

    await button.click()
    await expect(page.getByText(/Läuft seit/)).toBeVisible()
    await button.click()
    await expect(button).toContainText('2')
  })

  test('Kliniktasche ist vorbefüllt und abhakbar', async ({ page }) => {
    await page.goto('/schwangerschaft/kliniktasche')
    await expect(page.getByRole('heading', { name: 'Unterlagen' })).toBeVisible()
    await expect(page.getByText('0 /')).toBeVisible()

    await page.getByRole('checkbox', { name: /Eltern-Kind-Pass abhaken/ }).click()
    await expect(page.getByText('1 /')).toBeVisible()
  })

  test('Eltern-Kind-Pass-Termine sind vorbelegt', async ({ page }) => {
    await page.goto('/schwangerschaft/termine')
    await expect(page.getByText('1. Untersuchung – Erstuntersuchung')).toBeVisible()
    await expect(page.getByText('Zuckerbelastungstest (oGTT)')).toBeVisible()
    await expect(page.getByText(/SSW 24–28/)).toBeVisible()
  })

  test('Namensvoting legt Vorschläge an und zeigt offene Bewertungen', async ({ page }) => {
    await page.goto('/schwangerschaft/namen')
    await page.getByRole('button', { name: 'Namen vorschlagen' }).click()
    await page.getByRole('textbox', { name: 'Name' }).fill('Lina')
    await page.getByRole('button', { name: 'Hinzufügen' }).click()

    await page.getByRole('tab', { name: /Alle/ }).click()
    await expect(page.getByText('Lina')).toBeVisible()
    // Der eigene Vorschlag zaehlt als Ja, ist also nicht mehr offen.
    await page.getByRole('tab', { name: /Abstimmen/ }).click()
    await expect(page.getByText('Alles bewertet')).toBeVisible()
  })

  test('Werte lassen sich eintragen', async ({ page }) => {
    await page.goto('/schwangerschaft/werte')
    await page.getByRole('button', { name: 'Werte eintragen' }).click()
    await page.getByLabel('Gewicht (kg)').fill('68,4')
    await page.getByLabel('Blutdruck oben').fill('118')
    await page.getByLabel('Blutdruck unten').fill('74')
    await page.getByRole('button', { name: 'Übelkeit' }).click()
    await page.getByRole('button', { name: 'Speichern' }).click()

    await expect(page.getByText('68,4 kg · 118/74 mmHg')).toBeVisible()
    await expect(page.getByText('Übelkeit', { exact: true }).first()).toBeVisible()
  })
})
