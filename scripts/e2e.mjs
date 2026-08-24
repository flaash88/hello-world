#!/usr/bin/env node
/**
 * Ein Befehl für die E2E-Tests, auch auf einer frischen Maschine.
 *
 *   npm run test:e2e            – Datenbank, Migration, Build, Server, Tests
 *   npm run test:e2e -- --keep-build   – ohne Neubau (schneller beim Iterieren)
 *   npm run test:e2e -- e2e/notfall.spec.ts   – nur diese Datei
 *
 * Woher die Datenbank kommt, entscheidet sich in dieser Reihenfolge:
 *
 *   1. `E2E_DATABASE_URL` – wenn gesetzt, wird genau die benutzt.
 *   2. Docker – ein Wegwerf-Container `postgres:16-alpine`, der am Ende wieder
 *      verschwindet. Der saubere Weg auf dem Server und in CI.
 *   3. Ein lokal laufender Postgres unter `DATABASE_URL`.
 *
 * Gibt es keine davon, bricht das Skript ab und sagt welche drei Wege es
 * versucht hat – statt in einen Timeout zu laufen, in dem man raten muss.
 *
 * Aufgeräumt wird immer: der Container wird auch bei Strg-C und bei einem
 * Fehlschlag entfernt.
 */
import { execFileSync, spawn, spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import process from 'node:process'

function log(text) {
  console.log(`[e2e] ${text}`)
}

/**
 * `.env` einlesen, soweit noch nichts gesetzt ist.
 *
 * Prisma und Next lesen die Datei selbst; dieses Skript muss sie aber kennen,
 * bevor es entscheidet, ob schon eine Datenbank da ist. Ohne das meldet es
 * "keine Datenbank gefunden", obwohl eine laeuft.
 */
function ladeEnvDatei(pfad = '.env') {
  if (!existsSync(pfad)) return
  for (const zeile of readFileSync(pfad, 'utf8').split('\n')) {
    const treffer = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(zeile)
    if (!treffer) continue
    const [, name, roh] = treffer
    if (process.env[name] !== undefined) continue
    process.env[name] = roh.trim().replace(/^["']|["']$/g, '')
  }
}

ladeEnvDatei()

/**
 * Vorinstalliertes Chromium finden.
 *
 * In Containern liegt der Browser oft schon da (`PLAYWRIGHT_BROWSERS_PATH`),
 * aber nicht unter dem Pfad, den Playwright fuer seine Version erwartet – dann
 * verlangt es `npx playwright install`, obwohl ein brauchbarer Browser da ist.
 * Die Konfiguration liest `PLAYWRIGHT_CHROMIUM_PATH`; hier wird sie gesetzt,
 * wenn wir fuendig werden.
 */
function findeChromium() {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) return
  const basis = process.env.PLAYWRIGHT_BROWSERS_PATH
  const kandidaten = [
    basis && `${basis}/chromium`,
    '/opt/pw-browsers/chromium',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean)
  for (const pfad of kandidaten) {
    if (existsSync(pfad)) {
      process.env.PLAYWRIGHT_CHROMIUM_PATH = pfad
      log(`Benutze den vorhandenen Browser unter ${pfad}.`)
      return
    }
  }
}

const CONTAINER = `sproessling-e2e-${randomBytes(4).toString('hex')}`
const PG_PORT = Number(process.env.E2E_PG_PORT ?? 55432)
const PG_URL = `postgresql://sproessling:sproessling@127.0.0.1:${PG_PORT}/sproessling?schema=public`
/** Wie lange auf einen frisch gestarteten Postgres gewartet wird. */
const PG_BEREIT_SEKUNDEN = 60

let container = null

function lauf(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', ...opts })
  if (result.error) throw result.error
  return result.status ?? 1
}

function still(cmd, args) {
  return spawnSync(cmd, args, { stdio: 'pipe', encoding: 'utf8' })
}

function dockerNutzbar() {
  const result = still('docker', ['info'])
  return result.status === 0
}

/** Antwortet unter dieser URL eine Datenbank? */
function erreichbar(url) {
  const ziel = new URL(url)
  const result = still('pg_isready', [
    '-h',
    ziel.hostname,
    '-p',
    ziel.port || '5432',
    '-t',
    '3',
  ])
  return result.status === 0
}

function startePostgres() {
  log(`Starte Postgres im Container ${CONTAINER} auf Port ${PG_PORT}.`)
  const status = lauf('docker', [
    'run', '--rm', '--detach',
    '--name', CONTAINER,
    '--publish', `127.0.0.1:${PG_PORT}:5432`,
    '--env', 'POSTGRES_USER=sproessling',
    '--env', 'POSTGRES_PASSWORD=sproessling',
    '--env', 'POSTGRES_DB=sproessling',
    // Kein dauerhaftes Volume: die Testdatenbank soll nichts überleben.
    '--tmpfs', '/var/lib/postgresql/data',
    'postgres:16-alpine',
  ])
  if (status !== 0) throw new Error('Der Postgres-Container ließ sich nicht starten.')
  container = CONTAINER

  for (let i = 0; i < PG_BEREIT_SEKUNDEN; i++) {
    const result = still('docker', ['exec', CONTAINER, 'pg_isready', '-U', 'sproessling'])
    if (result.status === 0) {
      log('Postgres ist bereit.')
      return
    }
    execFileSync('sleep', ['1'])
  }
  throw new Error(`Postgres war nach ${PG_BEREIT_SEKUNDEN} Sekunden nicht bereit.`)
}

function raeumeAuf() {
  if (!container) return
  log(`Entferne den Container ${container}.`)
  still('docker', ['rm', '--force', container])
  container = null
}

function datenbankUrl() {
  if (process.env.E2E_DATABASE_URL) {
    log('Benutze die Datenbank aus E2E_DATABASE_URL.')
    return process.env.E2E_DATABASE_URL
  }
  if (dockerNutzbar()) {
    startePostgres()
    return PG_URL
  }
  const lokal = process.env.DATABASE_URL
  if (lokal && erreichbar(lokal)) {
    log('Kein nutzbarer Docker-Daemon – benutze den laufenden Postgres aus DATABASE_URL.')
    return lokal
  }
  throw new Error(
    [
      'Keine Datenbank für die Tests gefunden. Versucht wurde, in dieser Reihenfolge:',
      '  1. E2E_DATABASE_URL – nicht gesetzt.',
      '  2. Ein Wegwerf-Container über Docker – der Daemon antwortet nicht.',
      `  3. Ein laufender Postgres unter DATABASE_URL – ${lokal ? 'antwortet nicht' : 'nicht gesetzt'}.`,
      '',
      'Entweder Docker starten, oder einen Postgres hochziehen und E2E_DATABASE_URL setzen:',
      '  docker run --rm -d -p 55432:5432 -e POSTGRES_USER=sproessling \\',
      '    -e POSTGRES_PASSWORD=sproessling -e POSTGRES_DB=sproessling postgres:16-alpine',
      `  E2E_DATABASE_URL='${PG_URL}' npm run test:e2e`,
    ].join('\n'),
  )
}

async function main() {
  const argv = process.argv.slice(2)
  const keepBuild = argv.includes('--keep-build')
  const playwrightArgs = argv.filter((arg) => arg !== '--keep-build')

  findeChromium()
  const url = datenbankUrl()
  // Alles Weitere – Migration, Seed im globalSetup, der Testserver – redet mit
  // genau dieser Datenbank.
  const env = { ...process.env, DATABASE_URL: url, NODE_ENV: 'production', COOKIE_SECURE: 'false' }

  log('Spiele die Migrationen ein.')
  if (lauf('npx', ['prisma', 'migrate', 'deploy'], { env }) !== 0) {
    throw new Error('Die Migrationen liefen nicht durch.')
  }

  if (keepBuild) {
    log('Überspringe den Build (--keep-build).')
  } else {
    log('Baue die App.')
    // Der Build braucht NODE_ENV nicht gesetzt – Next setzt es selbst.
    const bauEnv = { ...env }
    delete bauEnv.NODE_ENV
    if (lauf('npm', ['run', 'build'], { env: bauEnv }) !== 0) {
      throw new Error('Der Build schlug fehl.')
    }
  }

  log('Starte die Tests. Datenbank, Server und Aufräumen macht dieses Skript.')
  const code = await new Promise((resolve) => {
    const kind = spawn('npx', ['playwright', 'test', '--reporter=line', ...playwrightArgs], {
      stdio: 'inherit',
      env,
    })
    kind.on('close', (status) => resolve(status ?? 1))
  })
  return code
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    raeumeAuf()
    process.exit(130)
  })
}

try {
  const code = await main()
  raeumeAuf()
  process.exit(code)
} catch (error) {
  raeumeAuf()
  console.error(`[e2e] ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
