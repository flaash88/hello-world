import type { Page } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { createHash, randomBytes } from 'node:crypto'

export const PASSWORD = 'ein-sicheres-passwort'

const prisma = new PrismaClient()

function hashToken(token: string): string {
  return createHash('sha256').update(`${process.env.SESSION_SECRET ?? ''}:${token}`).digest('hex')
}

/**
 * Legt einen frischen Haushalt mit eigenem Einladungscode an. Jeder Test
 * bekommt so seine eigenen Daten – Einladungscodes sind einmalig verwendbar.
 */
export async function createHouseholdInvite(name = 'Testfamilie'): Promise<string> {
  const household = await prisma.household.create({
    data: { name, timezone: 'Europe/Vienna', settings: { create: {} } },
  })
  const code = `E2E-${randomBytes(6).toString('hex').toUpperCase()}`
  await prisma.invite.create({
    data: {
      householdId: household.id,
      codeHash: hashToken(code),
      label: 'E2E',
      expiresAt: new Date(Date.now() + 86400000),
    },
  })
  return code
}

/** Erzeugt einen zusaetzlichen Code fuer denselben Haushalt wie `email`. */
export async function inviteForUser(email: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { email } })
  const code = `E2E-${randomBytes(6).toString('hex').toUpperCase()}`
  await prisma.invite.create({
    data: {
      householdId: user.householdId,
      codeHash: hashToken(code),
      label: 'E2E Partner',
      expiresAt: new Date(Date.now() + 86400000),
    },
  })
  return code
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${randomBytes(4).toString('hex')}@example.org`
}

/**
 * Registriert einen User und laesst ihn angemeldet auf /onboarding zurueck.
 * Dazwischen liegt seit Phase 11 die Erklaerung zum Protokollmodus – sie kommt
 * genau einmal pro Haushalt.
 *
 * Standardmaessig werden danach alle Bereiche eingeschaltet: die App liefert
 * seit Phase 11 im Protokollmodus aus, und die meisten Tests pruefen etwas,
 * das dort abgeschaltet ist. Wer den Auslieferungszustand selbst pruefen will,
 * uebergibt `bereiche: 'auslieferung'`.
 */
export async function register(
  page: Page,
  {
    name,
    email,
    code,
    bereiche = 'alle',
  }: { name: string; email: string; code: string; bereiche?: 'alle' | 'auslieferung' },
): Promise<void> {
  await page.goto('/register')
  await page.getByLabel('Einladungscode').fill(code)
  await page.getByLabel('Dein Name').fill(name)
  await page.getByLabel('E-Mail').fill(email)
  await page.getByLabel('Passwort', { exact: true }).fill(PASSWORD)
  await page.getByLabel('Passwort wiederholen').fill(PASSWORD)
  await page.getByRole('button', { name: 'Konto anlegen' }).click()
  // Die Wurzel entscheidet, wo es weitergeht: die Erklaerung zum Protokollmodus
  // kommt einmal pro Haushalt, danach das Dashboard bzw. die Einrichtung. Wer
  // als zweite Person zu einem eingerichteten Haushalt dazukommt, sieht beides
  // nicht mehr.
  await page.waitForURL(/\/(willkommen|onboarding|heute)$/)
  if (page.url().endsWith('/willkommen')) {
    const zurEinrichtung = page.getByRole('button', { name: 'Kind oder Schwangerschaft anlegen' })
    if (await zurEinrichtung.count()) await zurEinrichtung.click()
    else await page.getByRole('button', { name: /Los geht/ }).click()
    await page.waitForURL(/\/(onboarding|heute)$/)
  }
  if (bereiche === 'alle') await alleBereicheAn(email)
}

export async function login(page: Page, email: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('E-Mail').fill(email)
  await page.getByLabel('Passwort').fill(PASSWORD)
  await page.getByRole('button', { name: 'Anmelden' }).click()
  // Die Wurzel leitet auf den eingestellten Startbildschirm weiter.
  await page.waitForURL(/\/(heute|onboarding|willkommen)$/)
}

/** Legt Schwangerschaft mit `days` Tagen bis zum ET an (ab /onboarding). */
export async function setUpPregnancy(page: Page, days: number): Promise<void> {
  await page.getByRole('button', { name: 'Verstanden, weiter' }).click()
  await page.getByRole('button', { name: 'Schwangerschaft anlegen' }).click()
  await page.getByLabel('Errechneter Termin').fill(dateInput(days))
  await page.getByRole('button', { name: 'Anlegen' }).click()
  await page.waitForURL(/\/heute$/)
}

/** Legt ein Kind mit Geburtsdatum vor `daysAgo` Tagen an (ab /onboarding). */
export async function setUpChild(page: Page, name: string, daysAgo: number): Promise<void> {
  await page.getByRole('button', { name: 'Verstanden, weiter' }).click()
  await page.getByRole('button', { name: 'Kind anlegen' }).click()
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Geburtsdatum').fill(dateInput(-daysAgo))
  await page.getByRole('button', { name: 'Anlegen' }).click()
  await page.waitForURL(/\/heute$/)
}

/** Datum im Format fuer <input type="date">, `days` Tage ab heute. */
export function dateInput(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

/**
 * Schaltet fuer den Haushalt von `email` alle Bereiche ein.
 *
 * Ab Phase 11 liefert die App im Protokollmodus aus: Auswertung, Entwicklung,
 * Schlafrhythmus, Kreisuhr, Perzentile und der Eltern-Check-in sind aus. Tests,
 * die genau das pruefen, schalten es hier gezielt ein – der Auslieferungs-
 * zustand selbst hat einen eigenen Test.
 */
export async function alleBereicheAn(email: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { email } })
  await prisma.household.update({
    where: { id: user.householdId },
    data: { featureLevel: 'voll', featureOverrides: {}, featurePauseUntil: null },
  })
}

/** Legt einen Integrationstoken fuer den Haushalt von `email` an. */
export async function apiTokenFor(email: string, name = 'E2E'): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { email } })
  const token = `sp_${randomBytes(24).toString('base64url')}`
  await prisma.integrationToken.create({
    data: {
      householdId: user.householdId,
      userId: user.id,
      name,
      tokenHash: hashToken(token),
    },
  })
  return token
}

/** Entfernt alle Kinder eines Haushalts – fuer Tests, die den Zustand danach pruefen. */
export async function loescheKinder(email: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { email } })
  await prisma.child.deleteMany({ where: { householdId: user.householdId } })
}
