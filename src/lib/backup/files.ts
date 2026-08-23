import 'server-only'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { UPLOAD_DIR } from '@/lib/media/storage'

/**
 * Zugriff auf das Backup-Volume.
 *
 * Die naechtlichen Dumps schreibt der Sidecar-Container (docker/backup.sh);
 * die App bindet das Volume nur lesend ein und braucht deshalb weder pg_dump
 * noch Datenbank-Superrechte. "Jetzt sichern" legt stattdessen eine
 * Markierungsdatei im Upload-Verzeichnis ab – dort darf die App schreiben.
 * Der Sidecar liest sie jede Minute und sichert, wenn sie neuer ist als der
 * letzte Lauf. Dadurch braucht keiner der beiden Container Schreibrechte im
 * Volume des anderen.
 */
export const BACKUP_DIR = process.env.BACKUP_DIR ?? '/backups'
export const BACKUP_REQUEST_FILE =
  process.env.BACKUP_REQUEST_FILE ?? path.join(UPLOAD_DIR, '.backup-request')
const LAST_RUN_FILE = '.last-run'

export type BackupFile = {
  name: string
  bytes: number
  modifiedAt: string
}

export type BackupStatus = {
  /** Verzeichnis eingebunden und lesbar? */
  available: boolean
  directory: string
  files: BackupFile[]
  /** Zeitpunkt des letzten Sidecar-Laufs, falls bekannt. */
  lastRunAt: string | null
  /** Eine angeforderte Sicherung wartet noch auf den Sidecar. */
  requestPending: boolean
}

async function mtime(file: string): Promise<Date | null> {
  try {
    return (await fs.stat(file)).mtime
  } catch {
    return null
  }
}

export async function backupStatus(): Promise<BackupStatus> {
  const requestedAt = await mtime(BACKUP_REQUEST_FILE)
  const lastRun = await mtime(path.join(BACKUP_DIR, LAST_RUN_FILE))
  const pending = requestedAt !== null && (lastRun === null || requestedAt > lastRun)

  let entries: string[]
  try {
    entries = await fs.readdir(BACKUP_DIR)
  } catch {
    // Ohne eingebundenes Volume gibt es niemanden, der die Anforderung
    // abholt – dann ist "wartet noch" die falsche Auskunft.
    return {
      available: false,
      directory: BACKUP_DIR,
      files: [],
      lastRunAt: null,
      requestPending: false,
    }
  }

  const files: BackupFile[] = []
  for (const name of entries) {
    if (!name.endsWith('.sql.gz')) continue
    const stat = await mtime(path.join(BACKUP_DIR, name))
    if (!stat) continue // zwischen readdir und stat verschwunden
    const { size } = await fs.stat(path.join(BACKUP_DIR, name))
    files.push({ name, bytes: size, modifiedAt: stat.toISOString() })
  }
  files.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))

  return {
    available: true,
    directory: BACKUP_DIR,
    files,
    lastRunAt: lastRun?.toISOString() ?? null,
    requestPending: pending,
  }
}

/** Markiert eine Sicherung als angefordert; der Sidecar prueft jede Minute. */
export async function requestBackup(): Promise<{ ok: true } | { error: string }> {
  try {
    await fs.mkdir(path.dirname(BACKUP_REQUEST_FILE), { recursive: true })
    await fs.writeFile(BACKUP_REQUEST_FILE, `${new Date().toISOString()}\n`)
    return { ok: true }
  } catch {
    return { error: 'Die Anforderung liess sich nicht ablegen – ist das Upload-Volume beschreibbar?' }
  }
}
