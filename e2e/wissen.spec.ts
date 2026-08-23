import { expect, test } from '@playwright/test'
import { createHouseholdInvite, register, setUpPregnancy, uniqueEmail } from './helpers'

test.describe('Wissen', () => {
  test('ist über „Mehr“ erreichbar und listet alle Bereiche', async ({ page }) => {
    await register(page, { name: 'Mama', email: uniqueEmail('wissen'), code: await createHouseholdInvite() })
    await setUpPregnancy(page, 60)

    await page.goto('/mehr')
    await page.getByRole('link', { name: 'Wissen & Nachschlagen' }).click()
    await expect(page).toHaveURL(/\/wissen$/)

    for (const label of ['Ernährung', 'Darf ich das essen?', 'Geburtsvorbereitung', 'Stillen', 'Wochenbett']) {
      await expect(page.getByRole('link', { name: new RegExp(label) }).first()).toBeVisible()
    }
  })

  test('Lebensmittel-Check beantwortet die Klassiker', async ({ page }) => {
    await register(page, { name: 'Mama', email: uniqueEmail('essen'), code: await createHouseholdInvite() })
    await setUpPregnancy(page, 90)

    await page.goto('/wissen/lebensmittel')
    const search = page.getByLabel('Lebensmittel')

    await search.fill('Sushi')
    await expect(page.getByTestId('food-results').getByText('Besser nicht').first()).toBeVisible()

    await search.fill('Camembert')
    const results = page.getByTestId('food-results')
    await expect(results.getByText('Weichkäse mit Weißschimmel')).toBeVisible()
    await expect(results.getByText(/überbacken/)).toBeVisible()

    await search.fill('Kaffee')
    await expect(results.getByText('Kommt darauf an').first()).toBeVisible()
    await expect(results.getByText(/Zwei bis drei Tassen/)).toBeVisible()
  })

  test('sagt bei Unbekanntem ehrlich, dass nichts dazu dasteht', async ({ page }) => {
    await register(page, { name: 'Mama', email: uniqueEmail('unbekannt'), code: await createHouseholdInvite() })
    await setUpPregnancy(page, 90)

    await page.goto('/wissen/lebensmittel')
    await page.getByLabel('Lebensmittel').fill('Quinoaschaumsuppe')
    await expect(page.getByText('Dazu steht hier nichts.')).toBeVisible()
    await expect(page.getByTestId('food-results')).toHaveCount(0)
  })

  test('Lebensmittel lassen sich auch nach Gruppen durchblättern', async ({ page }) => {
    await register(page, { name: 'Mama', email: uniqueEmail('gruppen'), code: await createHouseholdInvite() })
    await setUpPregnancy(page, 90)

    await page.goto('/wissen/lebensmittel')
    await expect(page.getByText('Die fünf Grundregeln')).toBeVisible()
    await page.getByRole('button', { name: 'Fisch & Meeresfrüchte' }).click()
    await expect(page.getByTestId('food-results').getByText('Räucherfisch & Graved Lachs')).toBeVisible()
  })

  test('Ernährung startet im aktuellen Trimester und lässt wechseln', async ({ page }) => {
    await register(page, { name: 'Mama', email: uniqueEmail('naehr'), code: await createHouseholdInvite() })
    // Rund 30 Tage bis zum Termin – das ist das dritte Trimester.
    await setUpPregnancy(page, 30)

    await page.goto('/wissen/ernaehrung')
    await expect(page.getByRole('tab', { name: /3. Drittel/ })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText('Ihr seid gerade hier', { exact: false })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Eisen' })).toBeVisible()

    await page.getByRole('tab', { name: /1. Drittel/ }).click()
    await expect(page.getByRole('heading', { name: 'Folsäure' })).toBeVisible()
    await expect(page.getByText(/400 µg/)).toBeVisible()
  })

  test('Geburtsvorbereitung zeigt ab SSW 36 die Maßnahmen, davor nicht', async ({ page }) => {
    await register(page, { name: 'Mama', email: uniqueEmail('vorb'), code: await createHouseholdInvite() })
    await setUpPregnancy(page, 28)

    await page.goto('/wissen/geburtsvorbereitung')
    await expect(page.getByText('Dammmassage beginnen')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Tiefe Hocke mit Stütze' })).toBeVisible()
    await expect(page.getByText(/Hebamme/).first()).toBeVisible()
  })

  test('Behördenwege lassen sich abhaken und bleiben abgehakt', async ({ page }) => {
    await register(page, { name: 'Mama', email: uniqueEmail('amt'), code: await createHouseholdInvite() })
    await setUpPregnancy(page, 60)

    await page.goto('/wissen/behoerdenwege')
    await expect(page.getByRole('heading', { name: 'Vor der Geburt' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Nach der Geburt' })).toBeVisible()

    // Die Fristen, die am leichtesten gerissen werden, stehen direkt am Eintrag.
    await expect(page.getByText(/Spätestens drei Monate vor dem errechneten Termin/)).toBeVisible()
    await expect(page.getByText(/rückwirkend höchstens 182 Tage/)).toBeVisible()
    await expect(page.getByText('passiert automatisch')).toBeVisible()

    const item = page.getByRole('checkbox', { name: /Schwangerschaft dem Arbeitgeber melden/ })
    await item.click()
    await expect(page.getByText('erledigt von Mama')).toBeVisible()

    await page.reload()
    await expect(page.getByRole('checkbox', { name: /Schwangerschaft dem Arbeitgeber melden/ })).toBeChecked()
  })

  test('Rezepte lassen sich filtern', async ({ page }) => {
    await register(page, { name: 'Mama', email: uniqueEmail('rezept'), code: await createHouseholdInvite() })
    await setUpPregnancy(page, 60)

    await page.goto('/wissen/rezepte')
    const all = await page.getByTestId('recipe-list').getByRole('listitem').count()

    await page.getByRole('button', { name: 'vorkochen & einfrieren' }).click()
    await expect(page.getByText(/^\d+ Rezepte?$/)).toBeVisible()
    const filtered = await page.getByTestId('recipe-list').locator('> li').count()
    expect(filtered).toBeLessThan(all)
    await expect(page.getByRole('heading', { name: 'Linsensuppe für den Vorrat' })).toBeVisible()
  })

  test('Wochenbett nennt die Warnzeichen zuerst', async ({ page }) => {
    await register(page, { name: 'Mama', email: uniqueEmail('wobe'), code: await createHouseholdInvite() })
    await setUpPregnancy(page, 60)

    await page.goto('/wissen/wochenbett')
    await expect(page.getByText('Sofort anrufen bei')).toBeVisible()
    await expect(page.getByText(/Fieber über 38/)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Babyblues' })).toBeVisible()
  })

  test('Stillen erklärt Aufbewahrung und Milchstau', async ({ page }) => {
    await register(page, { name: 'Mama', email: uniqueEmail('still'), code: await createHouseholdInvite() })
    await setUpPregnancy(page, 60)

    await page.goto('/wissen/stillen')
    await expect(page.getByRole('heading', { name: 'Milchstau' })).toBeVisible()
    await expect(page.getByText('bis zu 4 Tage')).toBeVisible()
    await expect(page.getByText(/nie wieder einfrieren/)).toBeVisible()
  })
})
