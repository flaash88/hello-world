import { test, expect, type Page } from '@playwright/test'
import { createHouseholdInvite, inviteForUser, register, setUpChild, uniqueEmail } from './helpers'

async function windelEintragen(page: Page, notiz: string) {
  await page.goto('/heute')
  await page.getByRole('button', { name: 'Windel', exact: true }).click()
  await page.getByLabel('Notiz').fill(notiz)
  await page.getByRole('button', { name: 'Speichern' }).click()
}

test.describe('Doppelerfassung', () => {
  test('meldet sich, wenn beide dasselbe eintragen – ohne zu blockieren', async ({ browser }) => {
    const code = await createHouseholdInvite('Doppelt')
    const mamaEmail = uniqueEmail('dup-mama')

    const mamaContext = await browser.newContext()
    const mama = await mamaContext.newPage()
    await register(mama, { name: 'Sarah', email: mamaEmail, code })
    await setUpChild(mama, 'Lina', 30)

    const papaContext = await browser.newContext()
    const papa = await papaContext.newPage()
    await register(papa, { name: 'Papa', email: uniqueEmail('dup-papa'), code: await inviteForUser(mamaEmail) })

    await windelEintragen(mama, 'Von Sarah')
    await windelEintragen(papa, 'Von Papa')

    // Der Eintrag ist gespeichert – blockiert wird nichts.
    await expect(papa.getByTestId('event-list').getByText('Von Papa').first()).toBeVisible()

    const hinweis = papa.getByTestId('duplikat-hinweis')
    await expect(hinweis).toBeVisible()
    await expect(hinweis).toContainText('Sarah hat')
    await expect(hinweis).toContainText('eine Windel eingetragen')
    await expect(hinweis.getByRole('button', { name: 'Zusammenführen' })).toBeVisible()
    await expect(hinweis.getByRole('button', { name: 'Beide behalten' })).toBeVisible()
    await expect(hinweis.getByRole('button', { name: 'Meinen löschen' })).toBeVisible()

    await mamaContext.close()
    await papaContext.close()
  })

  test('führt zusammen und behält den älteren Eintrag', async ({ browser }) => {
    const code = await createHouseholdInvite('Doppelt2')
    const mamaEmail = uniqueEmail('dup2-mama')

    const mamaContext = await browser.newContext()
    const mama = await mamaContext.newPage()
    await register(mama, { name: 'Sarah', email: mamaEmail, code })
    await setUpChild(mama, 'Lina', 30)

    const papaContext = await browser.newContext()
    const papa = await papaContext.newPage()
    await register(papa, { name: 'Papa', email: uniqueEmail('dup2-papa'), code: await inviteForUser(mamaEmail) })

    await windelEintragen(mama, 'Von Sarah')
    await windelEintragen(papa, 'Von Papa')

    await papa.getByTestId('duplikat-hinweis').getByRole('button', { name: 'Zusammenführen' }).click()
    await expect(papa.getByText('Zusammengeführt')).toBeVisible()

    // Der ältere Eintrag bleibt, der neuere ist weg.
    await papa.goto('/verlauf')
    await expect(papa.getByText('Von Sarah')).toBeVisible()
    await expect(papa.getByText('Von Papa')).toHaveCount(0)

    await mamaContext.close()
    await papaContext.close()
  })

  test('meldet ein bestätigtes Paar nicht erneut', async ({ browser }) => {
    const code = await createHouseholdInvite('Doppelt3')
    const mamaEmail = uniqueEmail('dup3-mama')

    const mamaContext = await browser.newContext()
    const mama = await mamaContext.newPage()
    await register(mama, { name: 'Sarah', email: mamaEmail, code })
    await setUpChild(mama, 'Lina', 30)

    const papaContext = await browser.newContext()
    const papa = await papaContext.newPage()
    await register(papa, { name: 'Papa', email: uniqueEmail('dup3-papa'), code: await inviteForUser(mamaEmail) })

    await windelEintragen(mama, 'Von Sarah')
    await windelEintragen(papa, 'Von Papa')

    await papa.getByTestId('duplikat-hinweis').getByRole('button', { name: 'Beide behalten' }).click()
    await expect(papa.getByText('Beide bleiben')).toBeVisible()

    // Beide Einträge stehen weiter da, und der Fall ist erledigt.
    await papa.goto('/duplikate')
    await expect(papa.getByText('Nichts offen')).toBeVisible()

    await mamaContext.close()
    await papaContext.close()
  })

  test('meldet nichts, wenn dieselbe Person zweimal einträgt', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('dup4'), code })
    await setUpChild(page, 'Lina', 30)

    await windelEintragen(page, 'Erste')
    await windelEintragen(page, 'Zweite')

    await expect(page.getByTestId('duplikat-hinweis')).toBeHidden()
  })

  test('meldet nichts bei unterschiedlichen Kategorien', async ({ browser }) => {
    const code = await createHouseholdInvite('Doppelt5')
    const mamaEmail = uniqueEmail('dup5-mama')

    const mamaContext = await browser.newContext()
    const mama = await mamaContext.newPage()
    await register(mama, { name: 'Sarah', email: mamaEmail, code })
    await setUpChild(mama, 'Lina', 30)

    const papaContext = await browser.newContext()
    const papa = await papaContext.newPage()
    await register(papa, { name: 'Papa', email: uniqueEmail('dup5-papa'), code: await inviteForUser(mamaEmail) })

    await windelEintragen(mama, 'Windel von Sarah')

    await papa.goto('/heute')
    await papa.getByRole('button', { name: 'Etwas anderes eintragen' }).click()
    await papa.getByRole('button', { name: 'Gesundheit', exact: true }).click()
    await papa.getByRole('textbox', { name: /^Temperatur/ }).fill('37,0')
    await papa.getByRole('button', { name: 'Speichern' }).click()

    await expect(papa.getByTestId('duplikat-hinweis')).toBeHidden()

    await mamaContext.close()
    await papaContext.close()
  })

  test('räumt offene Fälle über /duplikate auf', async ({ browser }) => {
    const code = await createHouseholdInvite('Doppelt6')
    const mamaEmail = uniqueEmail('dup6-mama')

    const mamaContext = await browser.newContext()
    const mama = await mamaContext.newPage()
    await register(mama, { name: 'Sarah', email: mamaEmail, code })
    await setUpChild(mama, 'Lina', 30)

    const papaContext = await browser.newContext()
    const papa = await papaContext.newPage()
    await register(papa, { name: 'Papa', email: uniqueEmail('dup6-papa'), code: await inviteForUser(mamaEmail) })

    await windelEintragen(mama, 'Von Sarah')
    await windelEintragen(papa, 'Von Papa')

    await papa.goto('/duplikate')
    const liste = papa.getByTestId('duplikat-liste')
    await expect(liste.getByRole('listitem').first()).toBeVisible()
    await expect(liste.getByText('Von Sarah')).toBeVisible()
    await expect(liste.getByText('Von Papa')).toBeVisible()
    // Nur der eigene Eintrag lässt sich löschen.
    await expect(liste.getByText('(du)')).toHaveCount(1)

    await liste.getByRole('button', { name: 'Meinen löschen' }).click()
    await expect(papa.getByText('Nichts offen')).toBeVisible()

    await mamaContext.close()
    await papaContext.close()
  })
})
