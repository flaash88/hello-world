import { test, expect } from '@playwright/test'
import { createHouseholdInvite, inviteForUser, register, setUpChild, uniqueEmail } from './helpers'

/**
 * Beide Elternteile sehen dasselbe, ohne neu zu laden: Der Server schickt die
 * Änderung über Postgres NOTIFY als SSE, der Client frischt daraufhin auf.
 */
test('Änderungen erscheinen beim zweiten Elternteil ohne Neuladen', async ({ browser }) => {
  const code = await createHouseholdInvite('Echtzeit')
  const mamaEmail = uniqueEmail('mama')

  const mamaContext = await browser.newContext()
  const mama = await mamaContext.newPage()
  await register(mama, { name: 'Mama', email: mamaEmail, code })
  await setUpChild(mama, 'Lina', 45)

  const papaCode = await inviteForUser(mamaEmail)
  const papaContext = await browser.newContext()
  const papa = await papaContext.newPage()
  await register(papa, { name: 'Papa', email: uniqueEmail('papa'), code: papaCode })
  await papa.goto('/')
  await expect(papa.getByRole('heading', { name: 'Hallo Papa!' })).toBeVisible()

  // Papa lässt die Startseite offen, Mama trägt etwas ein.
  await mama.getByRole('button', { name: /^Windel/ }).click()
  await mama.getByLabel('Notiz').fill('Von Mama eingetragen')
  await mama.getByRole('button', { name: 'Speichern' }).click()
  await expect(mama.getByText('Von Mama eingetragen').first()).toBeVisible()

  // Ohne Zutun von Papa erscheint der Eintrag auch bei ihm.
  await expect(papa.getByText('Von Mama eingetragen').first()).toBeVisible({ timeout: 20_000 })
  // Und mit der Zuschreibung, wer ihn gemacht hat.
  await expect(papa.getByTitle('Eingetragen von Mama').first()).toBeVisible()

  await mamaContext.close()
  await papaContext.close()
})
