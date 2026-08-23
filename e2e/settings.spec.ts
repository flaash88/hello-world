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

test.describe('Eigene Einschlafgeräusche', () => {
  /** Kleinste gültige WAV-Datei: RIFF-Header plus ein paar Samples. */
  function wavFile(): Buffer {
    const samples = 800
    const data = Buffer.alloc(samples * 2)
    for (let i = 0; i < samples; i += 1) data.writeInt16LE(Math.round(Math.sin(i / 8) * 3000), i * 2)
    const header = Buffer.alloc(44)
    header.write('RIFF', 0)
    header.writeUInt32LE(36 + data.length, 4)
    header.write('WAVE', 8)
    header.write('fmt ', 12)
    header.writeUInt32LE(16, 16)
    header.writeUInt16LE(1, 20)
    header.writeUInt16LE(1, 22)
    header.writeUInt32LE(8000, 24)
    header.writeUInt32LE(16000, 28)
    header.writeUInt16LE(2, 32)
    header.writeUInt16LE(16, 34)
    header.write('data', 36)
    header.writeUInt32LE(data.length, 40)
    return Buffer.concat([header, data])
  }

  test('lädt eine eigene Datei hoch, spielt sie und löscht sie wieder', async ({ page }) => {
    const email = uniqueEmail('sound')
    await register(page, { name: 'Mama', email, code: await createHouseholdInvite() })
    await setUpChild(page, 'Mila', 45)

    await page.goto('/sounds')
    await page.getByLabel('Name (optional)').fill('Regen am Fenster')
    await page.getByLabel('Audiodatei').setInputFiles({
      name: 'regen.wav',
      mimeType: 'audio/wav',
      buffer: wavFile(),
    })
    await page.getByRole('button', { name: 'Hinzufügen' }).click()

    await expect(page.getByText('Regen am Fenster')).toBeVisible()
    await expect(page.getByText(/^Eigene Datei · /)).toBeVisible()

    await page.getByRole('button', { name: 'Regen am Fenster abspielen' }).click()
    await expect(page.getByRole('button', { name: 'Wiedergabe beenden' })).toBeVisible()
    await page.getByRole('button', { name: 'Wiedergabe beenden' }).click()

    await page.getByRole('button', { name: 'Regen am Fenster löschen' }).click()
    await expect(page.getByText('Regen am Fenster')).toHaveCount(0)
  })

  test('weist Dateien ab, die keine Audiodateien sind', async ({ page }) => {
    const email = uniqueEmail('sound-fake')
    await register(page, { name: 'Mama', email, code: await createHouseholdInvite() })
    await setUpChild(page, 'Nils', 45)

    await page.goto('/sounds')
    await page.getByLabel('Audiodatei').setInputFiles({
      name: 'schummel.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('Das ist in Wahrheit ein Text und kein Klang.'),
    })
    await page.getByRole('button', { name: 'Hinzufügen' }).click()
    await expect(page.getByTestId('form-error')).toContainText('Audiodatei')
  })
})
