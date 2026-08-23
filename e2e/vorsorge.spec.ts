import { test, expect } from '@playwright/test'
import { createHouseholdInvite, register, setUpChild, uniqueEmail } from './helpers'

test.describe('Vorsorge', () => {
  test('zeigt Impfungen und Untersuchungen mit Zeitfenster und Quelle', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('vor'), code })
    // Zehn Wochen alt – die Rotavirus-Serie und die 2. Untersuchung sind durch.
    await setUpChild(page, 'Lina', 70)

    await page.goto('/vorsorge')
    await expect(page.getByRole('heading', { name: 'Vorsorge' })).toBeVisible()
    await expect(page.getByText(/^6-fach-Impfung, 1\. Dosis$/).first()).toBeVisible()

    // Die Quellenangabe steht unter jeder Ansicht.
    await expect(page.getByText(/Impfplan Österreich 2025\/2026/).first()).toBeVisible()
    await expect(page.getByText(/Stand 2025-10-10/)).toBeVisible()

    // Ungeprüfte Daten sagen das offen.
    await expect(page.getByText(/gegen den Impfplan Österreich 2025\/2026.*zu prüfen/s)).toBeVisible()
  })

  test('hakt eine Impfung ab und legt dabei ein Gesundheits-Event an', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('vor2'), code })
    await setUpChild(page, 'Lina', 100)

    await page.goto('/vorsorge')
    const karte = page
      .getByRole('listitem')
      .filter({ hasText: '6-fach-Impfung, 1. Dosis' })
      .first()
    await karte.getByRole('button', { name: 'Erledigt' }).click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByLabel('Wo?').fill('Ordination Dr. Berger')
    await page.getByLabel('Notiz').fill('gut vertragen')
    await page.getByRole('button', { name: 'Speichern' }).click()

    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page.getByText('Erledigt · 1')).toBeVisible()
    await expect(page.getByText('Bei: Ordination Dr. Berger')).toBeVisible()

    // Die Impfung steht jetzt auch im Verlauf unter Gesundheit.
    await page.goto('/verlauf')
    await expect(page.getByText(/6-fach-Impfung, 1\. Dosis/).first()).toBeVisible()
  })

  test('nimmt das Häkchen wieder zurück', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('vor3'), code })
    await setUpChild(page, 'Lina', 100)

    await page.goto('/vorsorge')
    const karte = page.getByRole('listitem').filter({ hasText: 'Rotavirus, 1. Teilimpfung' }).first()
    await karte.getByRole('button', { name: 'Erledigt' }).click()
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByText('Erledigt · 1')).toBeVisible()

    await page
      .getByRole('button', { name: 'Rotavirus, 1. Teilimpfung nicht erledigt' })
      .click()
    await expect(page.getByText('Erledigt · 1')).toBeHidden()
  })

  test('zeigt die Untersuchungen samt KBG-Fristen und Augenfacharzt-Termin', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('vor4'), code })
    await setUpChild(page, 'Lina', 40)

    await page.goto('/vorsorge')
    await page.getByRole('tab', { name: /Untersuchungen/ }).click()

    await expect(page.getByText('5 Untersuchungen in der Schwangerschaft')).toBeVisible()
    await expect(page.getByText(/1\. Erstuntersuchung des Neugeborenen/).first()).toBeVisible()
    await expect(page.getByText(/Je fehlendem Nachweis .*1\.300 weniger/)).toBeVisible()
    await expect(page.getByText('Weitere vier Untersuchungen nachweisen')).toBeVisible()

    // Die Augenuntersuchung braucht einen eigenen Termin bei der Fachärztin.
    const augen = page
      .getByRole('listitem')
      .filter({ hasText: 'Augenuntersuchung im 22. bis 26. Lebensmonat' })
      .first()
    await expect(augen.getByText('Eigener Termin')).toBeVisible()
    await expect(augen.getByText('Fachärztin oder Facharzt für Augenheilkunde')).toBeVisible()
  })

  test('bleibt bei abgelaufenem Fenster sachlich', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('vor5'), code })
    // Ein Jahr alt – die frühen Fenster sind zu.
    await setUpChild(page, 'Lina', 400)

    await page.goto('/vorsorge')
    const karte = page.getByRole('listitem').filter({ hasText: 'Rotavirus, 1. Teilimpfung' }).first()
    await expect(karte.getByText('Fenster vorbei')).toBeVisible()
    await expect(karte.getByText(/lässt sich nachholen/)).toBeVisible()
  })
})
