import { test, expect } from '@playwright/test'
import { createHouseholdInvite, dateInput, register, setUpChild, uniqueEmail } from './helpers'

test.describe('Zähne', () => {
  test('zeigt das Milchgebiss mit zwanzig Zähnen', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('zahn'), code })
    await setUpChild(page, 'Lina', 240)

    await page.goto('/zaehne')
    await expect(page.getByRole('heading', { name: 'Zähne' })).toBeVisible()
    await expect(page.getByText(/Milchzähne eingetragen|Milchzahn eingetragen/)).toHaveCount(0)

    const gebiss = page.getByRole('group', { name: 'Milchgebiss' })
    await expect(gebiss.getByRole('button')).toHaveCount(20)

    // Mit acht Monaten sind die unteren Schneidezähne bereits zu erwarten.
    await expect(
      gebiss.getByRole('button', { name: /Mittlerer Schneidezahn unten rechts · wird erwartet/ }),
    ).toBeVisible()
    // Die Backenzähne dagegen noch lange nicht.
    await expect(
      gebiss.getByRole('button', { name: /Zweiter Backenzahn unten links · noch nicht dran/ }),
    ).toBeVisible()
  })

  test('trägt einen Zahn ein und legt dabei den Meilenstein an', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('zahn2'), code })
    await setUpChild(page, 'Lina', 240)

    await page.goto('/zaehne')
    await page
      .getByRole('button', { name: /Mittlerer Schneidezahn unten rechts/ })
      .click()

    await expect(page.getByRole('dialog')).toBeVisible()
    // Die Spanne steht als Spanne da, nicht als Termin.
    await expect(page.getByText(/üblich zwischen 6 und 10 Monaten/)).toBeVisible()

    await page.getByLabel('Durchgebrochen am').fill(dateInput(-10))
    await page.getByRole('button', { name: 'Speichern' }).click()

    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page.getByText('Ein Milchzahn eingetragen')).toBeVisible()
    await expect(page.getByText(/Erster Zahn:/)).toBeVisible()

    // Der Meilenstein „Erster Zahn" ist damit ohne zweites Zutun abgehakt.
    await page.goto('/entwicklung/meilensteine')
    await page.getByRole('tab', { name: 'Da', exact: true }).click()
    await expect(page.getByText('Erster Zahn')).toBeVisible()
  })

  test('lässt den Eintrag wieder entfernen', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('zahn3'), code })
    await setUpChild(page, 'Lina', 240)

    await page.goto('/zaehne')
    await page.getByRole('button', { name: /Mittlerer Schneidezahn unten links/ }).click()
    await page.getByLabel('Durchgebrochen am').fill(dateInput(-5))
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByText('Ein Milchzahn eingetragen')).toBeVisible()

    await page.getByRole('button', { name: /Mittlerer Schneidezahn unten links · da/ }).click()
    await page.getByRole('button', { name: 'Eintrag entfernen' }).click()
    await expect(page.getByText(/Milchzähne eingetragen|Milchzahn eingetragen/)).toHaveCount(0)
  })

  test('weist einen Ausfall vor dem Durchbruch zurück', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('zahn4'), code })
    await setUpChild(page, 'Lina', 240)

    await page.goto('/zaehne')
    await page.getByRole('button', { name: /Eckzahn oben rechts/ }).click()
    await page.getByLabel('Durchgebrochen am').fill(dateInput(-5))
    await page.getByLabel('Ausgefallen am').fill(dateInput(-20))
    await page.getByRole('button', { name: 'Speichern' }).click()

    await expect(page.getByTestId('form-error')).toContainText('vor dem Durchbruch')
  })

  test('ist von der Entwicklungsseite aus erreichbar', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('zahn5'), code })
    await setUpChild(page, 'Lina', 240)

    await page.goto('/entwicklung')
    await page.getByRole('link', { name: /^Zähne Zwanzig Milchzähne/ }).click()
    await expect(page.getByRole('heading', { name: 'Zähne' })).toBeVisible()
  })
})
