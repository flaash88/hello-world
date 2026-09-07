import 'server-only'
import { prisma } from '@/lib/db'
import {
  apiAntwort,
  authentifiziere,
  fehlerAntwort,
  istFehler,
  protokolliere,
  type ApiKontext,
} from './auth'

/**
 * Gemeinsamer Rahmen fuer alle /api/v1-Endpunkte: Token pruefen, aktives Kind
 * bestimmen, Antwort protokollieren. Damit sieht jeder Endpunkt gleich aus und
 * niemand vergisst das Audit-Log.
 */
export async function mitApi(
  request: Request,
  handler: (ctx: ApiKontext & { childId: string }) => Promise<Response>,
): Promise<Response> {
  const pfad = new URL(request.url).pathname
  const kontext = await authentifiziere(request)

  if (istFehler(kontext)) {
    await protokolliere({
      householdId: 'unbekannt',
      method: request.method,
      path: pfad,
      status: kontext.status,
      detail: kontext.fehler,
    })
    return fehlerAntwort(kontext)
  }

  // Das Kind kommt aus der Anfrage oder ist schlicht das einzige im Haushalt.
  const gewuenscht = new URL(request.url).searchParams.get('kind')
  const child = gewuenscht
    ? await prisma.child.findFirst({
        where: { id: gewuenscht, householdId: kontext.householdId, archived: false },
        select: { id: true },
      })
    : await prisma.child.findFirst({
        where: { householdId: kontext.householdId, archived: false },
        orderBy: [{ birthDate: 'asc' }, { createdAt: 'asc' }],
        select: { id: true },
      })

  if (!child) {
    await protokolliere({
      householdId: kontext.householdId,
      tokenId: kontext.tokenId,
      method: request.method,
      path: pfad,
      status: 404,
      detail: 'Kein Kind',
    })
    return apiAntwort({ error: 'Kein Kind gefunden.' }, { status: 404 })
  }

  let antwort: Response
  try {
    antwort = await handler({ ...kontext, childId: child.id })
  } catch (error) {
    antwort = apiAntwort(
      { error: error instanceof Error ? error.message : 'Unerwarteter Fehler.' },
      { status: 500 },
    )
  }

  await protokolliere({
    householdId: kontext.householdId,
    tokenId: kontext.tokenId,
    method: request.method,
    path: pfad,
    status: antwort.status,
  })

  return antwort
}
