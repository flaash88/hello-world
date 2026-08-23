import 'server-only'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { cache } from 'react'
import { impfplanSchema, untersuchungenSchema, type Impfplan, type Untersuchungen } from './schema'

/**
 * Laedt die versionierten Vorsorgedaten.
 *
 * Die Dateien werden beim ersten Zugriff gelesen und mit zod validiert – ein
 * Tippfehler beim naechsten Impfplan-Stand faellt damit sofort auf und nicht
 * erst in der UI.
 */
export const VORSORGE_DIR = path.join(process.cwd(), 'content', 'vorsorge')

const IMPFPLAN_FILE = 'impfplan-2025-2026.json'
const UNTERSUCHUNGEN_FILE = 'ekp-untersuchungen.json'

async function readJson(file: string): Promise<unknown> {
  return JSON.parse(await readFile(path.join(VORSORGE_DIR, file), 'utf8'))
}

export const loadImpfplan = cache(async (): Promise<Impfplan> => {
  return impfplanSchema.parse(await readJson(IMPFPLAN_FILE))
})

export const loadUntersuchungen = cache(async (): Promise<Untersuchungen> => {
  return untersuchungenSchema.parse(await readJson(UNTERSUCHUNGEN_FILE))
})
