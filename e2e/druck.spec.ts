import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test, expect } from '@playwright/test'
import { createHouseholdInvite, register, setUpChild, uniqueEmail } from './helpers'

/** Text und Seitenzahl eines gedruckten PDFs. */
function gedruckt(pdf: Buffer): { text: string; seiten: number } {
  const ordner = mkdtempSync(path.join(tmpdir(), 'sp-druck-'))
  const datei = path.join(ordner, 'druck.pdf')
  writeFileSync(datei, pdf)
  const text = execFileSync('pdftotext', [datei, '-'], { encoding: 'utf8' })
  // pdftotext trennt Seiten mit dem Seitenvorschub-Zeichen.
  const seiten = text.split('\f').filter((seite) => seite.trim().length > 0).length
  return { text, seiten }
}

/**
 * Die beiden Ausdrucke, die aus der Hand gegeben werden: das Stillprotokoll
 * fuer die Hebamme und der Zettel fuer die Ordination. Beide sollen auf eine
 * A4-Seite passen, schwarz auf weiss sein und keine Navigation zeigen.
 */
test.describe('Druckansichten', () => {
  test('Stillprotokoll passt auf eine A4-Seite, ohne Navigation', async ({ page, browser }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('dr1'), code })
    await setUpChild(page, 'Lina', 10)

    // Ein paar Einträge, damit die Tabelle nicht leer ist.
    for (let i = 0; i < 3; i += 1) {
      await page.goto('/heute')
      await page.getByRole('button', { name: 'Windel', exact: true }).click()
      await page.getByRole('button', { name: 'Speichern' }).click()
    }

    await page.goto('/protokoll?tage=14')
    await page.emulateMedia({ media: 'print' })

    const { text, seiten } = gedruckt(await page.pdf({ format: 'A4', printBackground: false }))

    // Eine Seite, so wie sie der Hebamme in die Hand gegeben wird.
    expect(seiten).toBe(1)

    // Der Kopf steht drauf, die Bedienung der App nicht.
    expect(text).toContain('Stillprotokoll')
    expect(text).toContain('Lina')
    expect(text).toContain('Zeitraum')
    expect(text).toMatch(/pro Tag/i)
    expect(text).not.toContain('Als PDF herunterladen')
    expect(text).not.toContain('Über das Browser-Menü')
    expect(text).not.toContain('Entwicklung')

    await page.emulateMedia({ media: 'screen' })
    expect(browser.version()).toBeTruthy()
  })

  test('Arztzettel passt auf eine A4-Seite', async ({ page }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('dr2'), code })
    await setUpChild(page, 'Lina', 200)

    await page.goto('/heute')
    await page.getByRole('button', { name: 'Etwas anderes eintragen' }).click()
    await page.getByRole('button', { name: 'Gesundheit', exact: true }).click()
    await page.getByRole('textbox', { name: /^Temperatur/ }).fill('38,9')
    await page.getByRole('button', { name: 'Speichern' }).click()

    await page.goto('/gesundheit/fieber')
    await page.getByRole('button', { name: 'Verstanden' }).click()
    await page.emulateMedia({ media: 'print' })

    const { text, seiten } = gedruckt(await page.pdf({ format: 'A4', printBackground: false }))
    expect(seiten).toBe(1)
    expect(text).toContain('Fieberverlauf')
    expect(text).toContain('Lina')
    expect(text).toMatch(/Messungen/i)
    expect(text).toMatch(/Platz für Notizen/i)
    // Kein App-Name als Werbung, keine Navigation.
    expect(text).not.toContain('Über das Browser-Menü')
    expect(text).not.toContain('Entwicklung')

    await page.emulateMedia({ media: 'screen' })
  })
})
