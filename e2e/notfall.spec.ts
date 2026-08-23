import { test, expect, type Page } from '@playwright/test'
import { createHouseholdInvite, register, setUpChild, uniqueEmail } from './helpers'

async function trageGesundheitEin(page: Page, art: string, feld: string, wert: string) {
  await page.goto('/heute')
  await page.getByRole('button', { name: 'Etwas anderes eintragen' }).click()
  await page.getByRole('button', { name: 'Gesundheit', exact: true }).click()
  await page.getByRole('button', { name: art, exact: true }).click()
  await page.getByLabel(feld, { exact: true }).fill(wert)
  await page.getByRole('button', { name: 'Speichern' }).click()
}

test.describe('Notfallkarte', () => {
  test.beforeEach(async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('not'), code })
    await setUpChild(page, 'Lina', 200)
  })

  test('zeigt die festen Notrufnummern als wählbare Links', async ({ page }) => {
    await page.goto('/notfall')
    await expect(page.getByRole('heading', { name: 'Notfall' })).toBeVisible()

    const notrufe = page.getByRole('region', { name: 'Notrufnummern' })
    await expect(notrufe.getByRole('link', { name: /144/ })).toHaveAttribute('href', 'tel:144')
    await expect(notrufe.getByRole('link', { name: /Vergiftungsinformationszentrale/ })).toHaveAttribute(
      'href',
      'tel:014064343',
    )
    await expect(notrufe.getByRole('link', { name: /1450/ })).toHaveAttribute('href', 'tel:1450')
  })

  test('pflegt Blutgruppe, Vorerkrankungen und Adresse', async ({ page }) => {
    await page.goto('/mehr/notfall')
    await page.getByLabel(/^Blutgruppe/).fill('0 Rh+')
    await page.getByLabel('Vorerkrankungen').fill('Keine')
    await page.getByLabel('Adresse').fill('Hauptstraße 1/2/5, 5020 Salzburg')
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByText('Gespeichert')).toBeVisible()

    await page.goto('/notfall')
    await expect(page.getByText('0 Rh+')).toBeVisible()
    await expect(page.getByText('Hauptstraße 1/2/5, 5020 Salzburg')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Adresse kopieren' })).toBeVisible()
  })

  test('legt Kontakte an und macht sie wählbar', async ({ page }) => {
    await page.goto('/mehr/notfall')
    await page.getByRole('button', { name: 'Kontakt hinzufügen' }).click()
    await page.getByLabel('Name').fill('Dr. Berger')
    await page.getByLabel('Telefonnummer').fill('0662 123 456')
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByText('Dr. Berger')).toBeVisible()

    await page.goto('/notfall')
    const kontakte = page.getByRole('region', { name: 'Kontakte' })
    await expect(kontakte.getByRole('link', { name: /Dr\. Berger/ })).toHaveAttribute(
      'href',
      'tel:0662123456',
    )
    await expect(kontakte.getByText('Kinderärztin')).toBeVisible()
  })

  test('liest Allergien und Dauermedikamente aus der Gesundheitskategorie', async ({ page }) => {
    await trageGesundheitEin(page, 'Allergie', 'Allergie oder Unverträglichkeit', 'Kuhmilcheiweiß')

    await page.goto('/notfall')
    await expect(page.getByText('Kuhmilcheiweiß')).toBeVisible()
    // Ohne Dauermedikament steht dort ausdrücklich „keine eingetragen".
    const angaben = page.getByRole('region', { name: 'Angaben zum Kind' })
    await expect(angaben.getByText('keine eingetragen')).toBeVisible()
  })

  test('legt keine zweiten Felder für Allergien an', async ({ page }) => {
    await page.goto('/mehr/notfall')
    await expect(page.getByLabel(/Allergie/)).toHaveCount(0)
    await expect(page.getByText(/Allergien und Dauermedikamente trägst du unter/)).toBeVisible()
  })

  test('steht ohne Netz aus dem lokalen Bestand', async ({ page, context }) => {
    await page.goto('/mehr/notfall')
    await page.getByLabel(/^Blutgruppe/).fill('A Rh−')
    await page.getByLabel('Adresse').fill('Hauptstraße 1, 5020 Salzburg')
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByText('Gespeichert')).toBeVisible()

    // Einmal mit Verbindung öffnen – danach liegt die Karte lokal.
    await page.goto('/notfall')
    await expect(page.getByText('A Rh−')).toBeVisible()

    // Die Karte steht wirklich in IndexedDB, nicht nur im Dokumentcache.
    const gespiegelt = await page.evaluate(async () => {
      const request = indexedDB.open('sproessling')
      await new Promise<void>((resolve, reject) => {
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
      const db = request.result
      const tx = db.transaction('notfall', 'readonly')
      const eintrag = await new Promise<unknown>((resolve) => {
        const anfrage = tx.objectStore('notfall').get('aktuell')
        anfrage.onsuccess = () => resolve(anfrage.result)
      })
      return JSON.stringify(eintrag)
    })
    expect(gespiegelt).toContain('A Rh−')
    expect(gespiegelt).toContain('Hauptstraße 1, 5020 Salzburg')

    await context.setOffline(true)
    await page.reload()

    await expect(page.getByRole('heading', { name: 'Notfall' })).toBeVisible()
    await expect(page.getByText('A Rh−')).toBeVisible()
    await expect(page.getByText('Hauptstraße 1, 5020 Salzburg')).toBeVisible()
    await expect(page.getByRole('link', { name: /144/ })).toBeVisible()
    await context.setOffline(false)
  })

  test('ist aus dem Menü erreichbar', async ({ page }) => {
    await page.goto('/mehr')
    await page.getByRole('link', { name: 'Notfallkarte' }).click()
    await expect(page.getByRole('heading', { name: 'Notfall' })).toBeVisible()
  })
})
