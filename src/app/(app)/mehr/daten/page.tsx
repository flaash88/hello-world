import type { Metadata } from 'next'
import Link from 'next/link'
import { Download, HardDriveDownload, ShieldAlert, Terminal } from 'lucide-react'
import { getAppContext } from '@/lib/household'
import { backupStatus } from '@/lib/backup/files'
import { formatDateTime } from '@/lib/time'
import { BackLink } from '@/components/layout/back-link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BackupNowButton } from './backup-now'
import { DangerZone } from './danger-zone'
import { localeTag } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Backup & Daten' }

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toLocaleString(localeTag(), { maximumFractionDigits: 0 })} KB`
  return `${(bytes / 1024 / 1024).toLocaleString(localeTag(), { maximumFractionDigits: 1 })} MB`
}

export default async function DataPage() {
  const ctx = await getAppContext()
  const status = await backupStatus()

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/mehr" label="Mehr" />
      <h1 className="font-display text-2xl font-bold">Backup & Daten</h1>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDriveDownload className="size-4 text-muted-foreground" aria-hidden />
            Sicherungen der Datenbank
          </CardTitle>
          <CardDescription>
            Der Backup-Container legt jede Nacht einen komprimierten Dump im Volume{' '}
            <code className="tabular">backups</code> ab und räumt ältere nach der eingestellten
            Aufbewahrung weg.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!status.available ? (
            <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
              Das Verzeichnis <code className="tabular">{status.directory}</code> ist in diesem
              Container nicht eingebunden. Im Docker-Compose-Setup passiert das automatisch – lokal
              in der Entwicklung nicht.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Letzter Lauf:{' '}
                {status.lastRunAt ? formatDateTime(new Date(status.lastRunAt), ctx.timezone) : 'unbekannt'}
              </p>
              {status.files.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Noch keine Sicherung im Volume. Nach dem ersten Start des Backup-Containers
                  sollte hier innerhalb einer Minute etwas stehen.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-border" data-testid="backup-list">
                  {status.files.slice(0, 14).map((file) => (
                    <li key={file.name} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
                      <span className="tabular shrink-0 text-xs text-muted-foreground">
                        {formatBytes(file.bytes)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          <BackupNowButton pending={status.requestPending} />
          <p className="text-xs text-muted-foreground">
            „Jetzt sichern“ hinterlegt eine Anforderung, die der Backup-Container innerhalb einer
            Minute aufgreift. Die App selbst greift nie direkt auf die Datenbankdateien zu.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Terminal className="size-4 text-muted-foreground" aria-hidden />
            Zurückspielen
          </CardTitle>
          <CardDescription>
            Am Host, im Verzeichnis mit der <code className="tabular">docker-compose.yml</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <ol className="flex flex-col gap-2 pl-4">
            <li className="list-decimal">
              App stoppen, damit niemand schreibt:
              <pre className="mt-1 overflow-x-auto rounded-lg bg-muted p-2 text-xs">
                docker compose stop app cron
              </pre>
            </li>
            <li className="list-decimal">
              Sicherung auswählen:
              <pre className="mt-1 overflow-x-auto rounded-lg bg-muted p-2 text-xs">
                docker compose run --rm backup ls -lh /backups
              </pre>
            </li>
            <li className="list-decimal">
              Datenbank leeren und einspielen:
              <pre className="mt-1 overflow-x-auto rounded-lg bg-muted p-2 text-xs">
                {'docker compose exec -T postgres psql -U $POSTGRES_USER -d postgres \\\n  -c "DROP DATABASE $POSTGRES_DB WITH (FORCE); CREATE DATABASE $POSTGRES_DB;"\n\ndocker compose run --rm -T backup sh -c \\\n  "gunzip -c /backups/DATEI.sql.gz | psql"'}
              </pre>
            </li>
            <li className="list-decimal">
              App wieder starten – Migrationen laufen beim Start automatisch:
              <pre className="mt-1 overflow-x-auto rounded-lg bg-muted p-2 text-xs">
                docker compose start app cron
              </pre>
            </li>
          </ol>
          <p className="text-muted-foreground">
            Die Fotos liegen nicht in der Datenbank, sondern im Volume{' '}
            <code className="tabular">uploads</code>. Für ein vollständiges Umziehen gehören beide
            Volumes zusammen gesichert.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="size-4 text-muted-foreground" aria-hidden />
            Daten mitnehmen
          </CardTitle>
          <CardDescription>
            Alles als JSON, CSV oder PDF – lesbar auch ohne Sprössling.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/mehr/export"
            className="flex min-h-14 items-center justify-center rounded-xl border-2 border-border px-4 font-semibold"
          >
            Zum Export
          </Link>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <ShieldAlert className="size-4" aria-hidden />
            Alles löschen
          </CardTitle>
          <CardDescription>
            Löscht den Haushalt „{ctx.household.name}“ mit allen Einträgen, Fotos, Messungen und
            beiden Konten. Das lässt sich nicht rückgängig machen – nur über eine Sicherung.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DangerZone householdName={ctx.household.name} memberCount={ctx.members.length} />
        </CardContent>
      </Card>
    </div>
  )
}
