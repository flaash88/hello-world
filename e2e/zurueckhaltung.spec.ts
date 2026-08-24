import { expect, test } from '@playwright/test'
import { alleBereicheAn, createHouseholdInvite, register, setUpChild, uniqueEmail } from './helpers'

test.describe('Auslieferungszustand', () => {
  test('begrüßt einmal und erklärt den Protokollmodus', async ({ page }) => {
    const email = uniqueEmail('willkommen')
    await page.goto('/register')
    await page.getByLabel('Einladungscode').fill(await createHouseholdInvite())
    await page.getByLabel('Dein Name').fill('Mama')
    await page.getByLabel('E-Mail').fill(email)
    await page.getByLabel('Passwort', { exact: true }).fill('ein-sicheres-passwort')
    await page.getByLabel('Passwort wiederholen').fill('ein-sicheres-passwort')
    await page.getByRole('button', { name: 'Konto anlegen' }).click()

    await expect(page).toHaveURL(/\/willkommen$/)
    await expect(page.getByRole('heading', { name: 'Willkommen bei Sprössling' })).toBeVisible()
    await expect(page.getByText('Die App startet als Protokoll')).toBeVisible()

    await page.getByRole('button', { name: 'Kind oder Schwangerschaft anlegen' }).click()
    await expect(page).toHaveURL(/\/onboarding$/)

    // Ein zweites Mal kommt die Seite nicht.
    await page.goto('/')
    await expect(page).not.toHaveURL(/\/willkommen$/)
  })

  test('zeigt weder Vorhersage noch Kreisuhr noch Auswertung', async ({ page }) => {
    const email = uniqueEmail('protokoll')
    await register(page, {
      name: 'Mama',
      email,
      code: await createHouseholdInvite(),
      bereiche: 'auslieferung',
    })
    await setUpChild(page, 'Lea', 120)

    await expect(page.getByRole('heading', { name: 'Der Tag im Kreis' })).toHaveCount(0)
    await expect(page.getByText('Schlaf heute')).toHaveCount(0)
    await expect(page.getByText('Euer Kind kennt seinen Rhythmus')).toHaveCount(0)

    // Die abgeschalteten Bereiche stehen nicht in der Leiste …
    const nav = page.getByRole('navigation', { name: 'Hauptnavigation' })
    await expect(nav.getByRole('link', { name: 'Entwicklung' })).toHaveCount(0)
    await expect(nav.getByRole('link', { name: 'Heute' })).toBeVisible()

    // … und nicht im Menü.
    await page.goto('/mehr')
    await expect(page.getByRole('link', { name: 'Auswertung', exact: true })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Entwicklung', exact: true })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Stillprotokoll' })).toBeVisible()
    // Die Einstellungen liegen hinter einer Zeile und bleiben immer erreichbar.
    await expect(page.getByRole('link', { name: 'Einstellungen', exact: true })).toBeVisible()

    // Auch direkt über die URL gibt es sie nicht.
    await page.goto('/auswertung')
    await expect(page).toHaveURL(/\/heute$/)
    await page.goto('/entwicklung/uebungen')
    await expect(page).toHaveURL(/\/heute$/)
  })

  test('meldet sich ab Werk nur bei Terminfristen', async ({ page }) => {
    const email = uniqueEmail('push-still')
    await register(page, {
      name: 'Mama',
      email,
      code: await createHouseholdInvite(),
      bereiche: 'auslieferung',
    })
    await setUpChild(page, 'Nino', 60)

    await page.goto('/mehr/benachrichtigungen')
    await expect(page.getByRole('switch', { name: /Fristen im Eltern-Kind-Pass/ })).toBeChecked()
    for (const name of [/Schlaffenster/, /Medikamenten-Intervall/, /Milchvorrat/, /Nachtschicht/]) {
      await expect(page.getByRole('switch', { name })).not.toBeChecked()
    }
    // Was es nie geben soll, steht auch nicht als Schalter da.
    await expect(page.getByText('Fütterung')).toHaveCount(0)
    await expect(page.getByText('Einträge der anderen Person')).toHaveCount(0)
  })
})

test.describe('Was die App anzeigt', () => {
  test('schaltet einen einzelnen Bereich dazu und wieder ab', async ({ page }) => {
    const email = uniqueEmail('schalter')
    await register(page, {
      name: 'Mama',
      email,
      code: await createHouseholdInvite(),
      bereiche: 'auslieferung',
    })
    await setUpChild(page, 'Mila', 150)

    await page.goto('/mehr/anzeige')
    await page.getByRole('switch', { name: /Der Tag im Kreis/ }).click()
    await expect(page.getByRole('switch', { name: /Der Tag im Kreis/ })).toBeChecked()

    await page.goto('/heute')
    await expect(page.getByRole('heading', { name: 'Der Tag im Kreis' })).toBeVisible()
    // Nur die Uhr – die Vorhersage hängt an einem eigenen Schalter.
    await expect(page.getByText('Euer Kind kennt seinen Rhythmus')).toHaveCount(0)

    await page.goto('/mehr/anzeige')
    await page.getByRole('switch', { name: /Der Tag im Kreis/ }).click()
    await page.goto('/heute')
    await expect(page.getByRole('heading', { name: 'Der Tag im Kreis' })).toHaveCount(0)
  })

  test('holt mit der Stufe „Alles" die Auswertung und die Entwicklung zurück', async ({ page }) => {
    const email = uniqueEmail('stufe')
    await register(page, {
      name: 'Mama',
      email,
      code: await createHouseholdInvite(),
      bereiche: 'auslieferung',
    })
    await setUpChild(page, 'Tim', 200)

    await page.goto('/mehr/anzeige')
    await page.getByRole('button', { name: /^Alles/ }).click()
    await expect(page.getByRole('switch', { name: /Auswertung/ })).toBeChecked()

    await page.goto('/auswertung')
    await expect(page).toHaveURL(/\/auswertung$/)
    await page.goto('/heute')
    await expect(
      page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', {
        name: 'Entwicklung',
      }),
    ).toBeVisible()

    // Und wieder zurück, ohne Daten zu verlieren.
    await page.goto('/mehr/anzeige')
    await page.getByRole('button', { name: 'App auf Protokollmodus zurücksetzen' }).click()
    await expect(page.getByRole('switch', { name: /Auswertung/ })).not.toBeChecked()
    await page.goto('/auswertung')
    await expect(page).toHaveURL(/\/heute$/)
  })

  test('Pause blendet alles Zusätzliche vorübergehend aus', async ({ page }) => {
    const email = uniqueEmail('pause')
    await register(page, {
      name: 'Mama',
      email,
      code: await createHouseholdInvite(),
      bereiche: 'auslieferung',
    })
    await setUpChild(page, 'Ida', 180)
    await alleBereicheAn(email)

    await page.goto('/heute')
    await expect(page.getByRole('heading', { name: 'Der Tag im Kreis' })).toBeVisible()

    await page.goto('/mehr/anzeige')
    await page.getByRole('button', { name: 'Drei Tage' }).click()
    await expect(page.getByText('Pause läuft')).toBeVisible()
    // Die Schalter zeigen weiter, was danach zurückkommt.
    await expect(page.getByRole('switch', { name: /Auswertung/ })).toBeChecked()

    await page.goto('/heute')
    await expect(page.getByRole('heading', { name: 'Der Tag im Kreis' })).toHaveCount(0)
    // Die Notfallkarte bleibt auch in der Pause erreichbar.
    await page.goto('/notfall')
    await expect(page).toHaveURL(/\/notfall$/)

    await page.goto('/mehr/anzeige')
    await page.getByRole('button', { name: 'Pause beenden' }).click()
    await page.goto('/heute')
    await expect(page.getByRole('heading', { name: 'Der Tag im Kreis' })).toBeVisible()
  })
})

test.describe('Nachtragen', () => {
  test('legt mehrere Einträge in einem Durchgang an', async ({ page }) => {
    const email = uniqueEmail('nachtrag')
    await register(page, {
      name: 'Papa',
      email,
      code: await createHouseholdInvite(),
      bereiche: 'auslieferung',
    })
    await setUpChild(page, 'Emil', 40)

    await page.getByRole('button', { name: 'Mehreres nachtragen' }).click()
    const dialog = page.getByRole('dialog')

    await dialog.getByLabel('Wann').first().fill('vor 2 Stunden')
    await expect(dialog.getByText(/vor 2 Std/)).toBeVisible()

    await dialog.getByRole('button', { name: 'Zeile hinzufügen' }).click()
    const zweite = dialog.getByLabel('Wann').nth(1)
    await zweite.fill('vor 45 min')
    await dialog.getByRole('button', { name: 'Windel', exact: true }).nth(1).click()

    await dialog.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByText('2 Einträge angelegt')).toBeVisible()

    // Nachgetragenes sieht aus wie sofort Erfasstes – keine Markierung.
    await page.goto('/verlauf')
    await expect(page.getByText('nachgetragen')).toHaveCount(0)
    await expect(page.getByText('Stillen').first()).toBeVisible()
    await expect(page.getByText('Windel').first()).toBeVisible()
  })

  test('speichert die verstandenen Zeilen und lässt die unklare stehen', async ({ page }) => {
    const email = uniqueEmail('nachtrag-teil')
    await register(page, {
      name: 'Papa',
      email,
      code: await createHouseholdInvite(),
      bereiche: 'auslieferung',
    })
    await setUpChild(page, 'Ben', 30)

    await page.getByRole('button', { name: 'Mehreres nachtragen' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Wann').first().fill('halb drei')
    await dialog.getByRole('button', { name: 'Zeile hinzufügen' }).click()
    await dialog.getByLabel('Wann').nth(1).fill('irgendwann gestern')
    await expect(dialog.getByText('Diese Zeitangabe versteht die App noch nicht.')).toBeVisible()

    await dialog.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByText('Eingetragen', { exact: true })).toBeVisible()
  })
})

test.describe('Mehr', () => {
  test('zeigt die Bereiche als Kacheln und die Einstellungen hinter einer Zeile', async ({
    page,
  }) => {
    const email = uniqueEmail('menu')
    await register(page, { name: 'Mama', email, code: await createHouseholdInvite() })
    await setUpChild(page, 'Noa', 20)

    await page.goto('/mehr')
    const bereiche = page.getByRole('navigation', { name: 'Bereiche' })
    await expect(bereiche.getByRole('link', { name: 'Notfallkarte' })).toBeVisible()
    await expect(bereiche.getByRole('link', { name: 'Stillprotokoll' })).toBeVisible()

    // Die Einstellungen liegen nicht mehr offen unter „Mehr“ …
    await expect(page.getByRole('link', { name: 'Kindprofil' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Backup & Daten' })).toHaveCount(0)

    // … sondern eine Ebene tiefer, und dort vollständig.
    await page.getByRole('link', { name: 'Einstellungen', exact: true }).click()
    await expect(page).toHaveURL(/\/mehr\/einstellungen$/)
    for (const name of [
      'Kindprofil',
      'Notfalldaten',
      'Zweite Person einladen',
      'Was die App anzeigt',
      'Benachrichtigungen',
      'Nachtmodus',
      'Einheiten & Startbildschirm',
      'Export',
      'Backup & Daten',
      'Automationen & API',
    ]) {
      await expect(page.getByRole('link', { name: new RegExp(name) })).toBeVisible()
    }
  })
})
