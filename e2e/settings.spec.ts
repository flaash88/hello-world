import { expect, test } from '@playwright/test'
import {
  PASSWORD,
  createHouseholdInvite,
  dateInput,
  inviteForUser,
  register,
  setUpChild,
  uniqueEmail,
} from './helpers'

test.describe('Eltern-Tab', () => {
  test('Check-in speichert Stimmung und eigenen Schlaf', async ({ page }) => {
    const email = uniqueEmail('eltern')
    await register(page, { name: 'Mama', email, code: await createHouseholdInvite() })
    await setUpChild(page, 'Lena', 90)

    // Der Eltern-Tab liegt in der Tab-Leiste, nicht zwei Ebenen tief.
    await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name: 'Wir' }).click()
    await expect(page).toHaveURL(/\/eltern$/)
    await expect(page.getByRole('heading', { name: 'Wir' })).toBeVisible()

    await page.getByRole('button', { name: 'Eigenen Schlaf dazu eintragen' }).click()
    await page.getByRole('textbox', { name: 'Stunden' }).fill('5,5')
    await page.getByRole('textbox', { name: 'Wie oft wach' }).fill('3')
    await page.getByRole('button', { name: 'Eintragen' }).click()

    await page.reload()
    await expect(page.getByText('Heute schon eingetragen')).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Stunden' })).toHaveValue('5,5')
  })

  test('Nachtschicht mit Übergabe-Notiz ist für beide sichtbar', async ({ page, browser }) => {
    const mamaMail = uniqueEmail('nacht-mama')
    await register(page, { name: 'Mama', email: mamaMail, code: await createHouseholdInvite() })
    await setUpChild(page, 'Jonas', 120)

    const papaMail = uniqueEmail('nacht-papa')
    const papaCode = await inviteForUser(mamaMail)
    const papaContext = await browser.newContext()
    const papa = await papaContext.newPage()
    await register(papa, { name: 'Papa', email: papaMail, code: papaCode })

    await page.goto('/eltern')
    await page.getByRole('tab', { name: 'Nachtschicht' }).click()
    await page.getByRole('button', { name: /Mama/ }).click()
    await page.getByLabel('Übergabe-Notiz').fill('Fläschchen steht im Kühlschrank.')
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByText('Nachtschicht eingetragen')).toBeVisible()

    await papa.goto('/eltern')
    await papa.getByRole('tab', { name: 'Nachtschicht' }).click()
    await expect(papa.getByLabel('Übergabe-Notiz')).toHaveValue('Fläschchen steht im Kühlschrank.')
    await papaContext.close()
  })

  test('privates Tagebuch sieht nur die eigene Person', async ({ page, browser }) => {
    const mamaMail = uniqueEmail('privat-mama')
    await register(page, { name: 'Mama', email: mamaMail, code: await createHouseholdInvite() })
    await setUpChild(page, 'Emil', 200)

    await page.goto('/eltern')
    await page.getByRole('tab', { name: 'Privat' }).click()
    await expect(page.getByText('Nur du siehst diese Einträge')).toBeVisible()
    await page.getByRole('button', { name: 'Eintrag schreiben' }).click()
    await page.getByLabel('Was möchtest du festhalten?').fill('Heute war ein harter Tag.')
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByText('Heute war ein harter Tag.')).toBeVisible()

    const papaMail = uniqueEmail('privat-papa')
    const papaCode = await inviteForUser(mamaMail)
    const papaContext = await browser.newContext()
    const papa = await papaContext.newPage()
    await register(papa, { name: 'Papa', email: papaMail, code: papaCode })
    await papa.goto('/eltern')
    await papa.getByRole('tab', { name: 'Privat' }).click()
    await expect(papa.getByText('Heute war ein harter Tag.')).toHaveCount(0)
    await expect(papa.getByText('Noch nichts geschrieben')).toBeVisible()
    await papaContext.close()
  })
})

test.describe('Einstellungen', () => {
  test('Kindprofil speichert Namen und errechneten Termin', async ({ page }) => {
    const email = uniqueEmail('kind')
    await register(page, { name: 'Mama', email, code: await createHouseholdInvite() })
    await setUpChild(page, 'Baby', 60)

    await page.goto('/mehr/kind')
    await page.getByLabel('Name').fill('Marlene')
    await page.getByLabel('Errechneter Termin (bei Frühgeburt)').fill(dateInput(-32))
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByText('Gespeichert')).toBeVisible()

    await page.reload()
    // Vier Wochen zu früh: Das korrigierte Alter liegt vier Wochen zurück.
    await expect(page.getByText(/korrigiert \d+ Wochen/)).toBeVisible()
    await page.goto('/heute')
    await expect(page.getByText('Marlene').first()).toBeVisible()
  })

  test('Einheiten ändern die Anzeige, nicht die Daten', async ({ page }) => {
    const email = uniqueEmail('einheiten')
    await register(page, { name: 'Mama', email, code: await createHouseholdInvite() })
    await setUpChild(page, 'Nora', 150)

    await page.goto('/heute')
    await page.getByRole('button', { name: /^Flasche/ }).click()
    await page.getByRole('textbox', { name: /^Menge/ }).fill('120')
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByTestId('event-list').getByText('120 ml')).toBeVisible()

    await page.goto('/mehr/darstellung')
    await page.getByRole('button', { name: 'Unzen' }).click()
    await page.getByRole('button', { name: 'Einheiten speichern' }).click()
    await expect(page.getByText('Einheiten gespeichert')).toBeVisible()

    await page.goto('/heute')
    await expect(page.getByTestId('event-list').getByText('4,1 oz')).toBeVisible()

    // Zurückgestellt steht wieder der eingetragene Wert da – gespeichert wurde
    // metrisch, gerundet wurde nur die Anzeige.
    await page.goto('/mehr/darstellung')
    await page.getByRole('button', { name: 'Milliliter' }).click()
    await page.getByRole('button', { name: 'Einheiten speichern' }).click()
    await page.goto('/heute')
    await expect(page.getByTestId('event-list').getByText('120 ml')).toBeVisible()
  })

  test('Startbildschirm und Schnellaktionen lassen sich einstellen', async ({ page }) => {
    const email = uniqueEmail('start')
    await register(page, { name: 'Mama', email, code: await createHouseholdInvite() })
    await setUpChild(page, 'Timo', 300)

    await page.goto('/mehr/darstellung')
    await page.getByRole('button', { name: 'Abpumpen' }).click()
    await page.getByRole('button', { name: 'Verlauf' }).click()
    await page.getByRole('button', { name: 'Speichern', exact: true }).click()
    await expect(page.getByText('Gespeichert')).toBeVisible()

    // Die Wurzel leitet jetzt auf den Verlauf.
    await page.goto('/')
    await expect(page).toHaveURL(/\/verlauf$/)

    await page.goto('/heute')
    await expect(page.getByRole('button', { name: 'Abpumpen' })).toBeVisible()
  })

  test('Backup-Seite erklärt das Zurückspielen und nimmt eine Anforderung an', async ({ page }) => {
    const email = uniqueEmail('backup')
    await register(page, { name: 'Mama', email, code: await createHouseholdInvite() })
    await setUpChild(page, 'Ida', 30)

    await page.goto('/mehr/daten')
    await expect(page.getByText('docker compose stop app cron')).toBeVisible()
    await page.getByRole('button', { name: 'Jetzt sichern' }).click()
    await expect(page.getByText('Sicherung angefordert')).toBeVisible()
  })

  test('Löschen verlangt Passwort und Bestätigungswort', async ({ page }) => {
    const email = uniqueEmail('loeschen')
    await register(page, { name: 'Mama', email, code: await createHouseholdInvite() })
    await setUpChild(page, 'Rosa', 10)

    await page.goto('/mehr/daten')
    await page.getByRole('button', { name: 'Haushalt und alle Daten löschen' }).click()

    await page.getByLabel('Dein Passwort').fill(PASSWORD)
    await page.getByLabel('Tippe LÖSCHEN').fill('vielleicht')
    await page.getByRole('button', { name: 'Endgültig löschen' }).click()
    await expect(page.getByTestId('form-error')).toContainText('LÖSCHEN')

    await page.getByLabel('Dein Passwort').fill('falsches-passwort')
    await page.getByLabel('Tippe LÖSCHEN').fill('LÖSCHEN')
    await page.getByRole('button', { name: 'Endgültig löschen' }).click()
    await expect(page.getByTestId('form-error')).toContainText('Passwort')

    await page.getByLabel('Dein Passwort').fill(PASSWORD)
    await page.getByRole('button', { name: 'Endgültig löschen' }).click()
    await page.waitForURL(/\/login$/)

    // Das Konto ist weg – anmelden geht nicht mehr.
    await page.getByLabel('E-Mail').fill(email)
    await page.getByLabel('Passwort').fill(PASSWORD)
    await page.getByRole('button', { name: 'Anmelden' }).click()
    await expect(page.getByTestId('form-error')).toBeVisible()
  })
})
