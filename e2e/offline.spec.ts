import { test, expect } from '@playwright/test'
import { createHouseholdInvite, register, setUpChild, uniqueEmail } from './helpers'

/**
 * Der Offline-Pfad ist das Feature, das man erst im Ernstfall bemerkt –
 * deshalb wird er hier mit echtem Verbindungsabbruch geprüft.
 */
test.describe('Offline', () => {
  test('Einträge werden offline gepuffert und beim Reconnect übertragen', async ({
    page,
    context,
  }) => {
    const code = await createHouseholdInvite()
    await register(page, { name: 'Mama', email: uniqueEmail('offline'), code })
    await setUpChild(page, 'Lina', 30)

    // Der Service Worker muss die Seite ausliefern können, bevor wir kappen.
    await page.waitForLoadState('networkidle')

    // Chromium meldet den Wechsel selbst an navigator.onLine und feuert die
    // online/offline-Ereignisse – genau wie ein echtes Funkloch.
    await context.setOffline(true)
    await expect(page.getByText(/^Offline/)).toBeVisible()

    // Direkt in die Queue schreiben – so wie es die App im Offline-Fall tut.
    await page.evaluate(async () => {
      const request = indexedDB.open('sproessling', 1)
      await new Promise<void>((resolve, reject) => {
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
      const db = request.result
      const tx = db.transaction('operations', 'readwrite')
      tx.objectStore('operations').put({
        op: 'create',
        clientId: 'e2e-offline-1',
        childId: document.querySelector<HTMLElement>('[data-child-id]')?.dataset.childId,
        type: 'diaper',
        startedAt: new Date().toISOString(),
        payload: { kind: 'both' },
        note: 'Im Funkloch eingetragen',
        queuedAt: new Date().toISOString(),
        attempts: 0,
      })
      await new Promise<void>((resolve) => {
        tx.oncomplete = () => resolve()
      })
      window.dispatchEvent(new CustomEvent('sp:queued'))
    })

    await expect(page.getByText(/1 Eintrag wartet/)).toBeVisible()

    await context.setOffline(false)

    // Der Eintrag landet am Server und die Warteanzeige verschwindet.
    await expect(page.getByText('Im Funkloch eingetragen').first()).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(/Eintrag wartet|Einträge warten/)).toHaveCount(0)
  })
})
