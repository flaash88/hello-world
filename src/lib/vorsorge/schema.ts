/**
 * Zod-Schemas fuer die Vorsorgedaten.
 *
 * Die Inhalte liegen als versionierte JSON-Dateien unter `content/vorsorge/`.
 * Sie sind bewusst Daten und kein Code: Impfplan und Eltern-Kind-Pass aendern
 * sich in eigenem Takt, und beim naechsten Stand wird die Datei getauscht,
 * nicht die Logik.
 *
 * Jede Datei traegt `quelle`, `version`, `stand` und `abgerufenAm`; `geprueft`
 * sagt, ob die Eintraege gegen das Originaldokument geprueft wurden. Solange
 * das `false` ist, zeigt die UI den `pruefhinweis` sichtbar an.
 */
import { z } from 'zod'

const herkunft = z.object({
  quelle: z.string().min(1),
  version: z.string().min(1),
  stand: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  abgerufenAm: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  geprueft: z.boolean(),
  pruefhinweis: z.string().optional(),
})

export type Herkunft = z.infer<typeof herkunft>

/**
 * Zeitfenster, gerechnet ab dem Geburtstag.
 *
 * Zwei Dinge machen das unhandlicher, als es aussieht. Erstens mischen die
 * Dokumente die Einheiten: die Rotavirus-Serie zaehlt in Lebenswochen, die
 * 6-fach-Impfung in Lebensmonaten, bei Pneumokokken steht der Beginn in Wochen
 * und das Ende in Monaten. Deshalb sind alle vier Felder unabhaengig
 * voneinander optional. Zweitens formulieren sie teils ordinal ("im 3.
 * Lebensmonat"), teils vollendet ("ab der vollendeten 7. Lebenswoche").
 *
 * In den JSON-Dateien steht darum durchgehend die **vollendete** Einheit; der
 * Wortlaut der Quelle bleibt daneben in `fensterText` bzw. `hinweis` stehen.
 * "im 3. Lebensmonat" ist also `vonMonaten: 2, bisMonaten: 3`.
 */
const fensterSchema = z
  .object({
    vonWochen: z.number().int().min(0).optional(),
    bisWochen: z.number().int().min(0).optional(),
    vonMonaten: z.number().int().min(0).optional(),
    bisMonaten: z.number().int().min(0).optional(),
  })
  .refine(
    (f) =>
      f.vonWochen !== undefined ||
      f.bisWochen !== undefined ||
      f.vonMonaten !== undefined ||
      f.bisMonaten !== undefined,
    { message: 'Ein Fenster braucht mindestens eine Grenze – sonst gehoert es auf null.' },
  )

export const impfungSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  schutzGegen: z.array(z.string().min(1)).min(1),
  dosisNr: z.number().int().min(1).nullable(),
  fenster: fensterSchema.nullable(),
  mindestabstandZurVordosisWochen: z.number().int().min(1).nullable(),
  kostenfrei: z.boolean().nullable(),
  hinweis: z.string().min(1),
  quelle: z.string().min(1).nullable(),
})

export const impfplanSchema = herkunft.extend({
  impfungen: z.array(impfungSchema).min(1),
})

export const untersuchungSchema = z.object({
  nummer: z.number().int().min(1),
  bezeichnung: z.string().min(1),
  fenster: fensterSchema.nullable(),
  fensterText: z.string().min(1),
  durchfuehrendeStelle: z.string().min(1),
  separaterTermin: z.boolean(),
  kbgRelevant: z.boolean(),
  inhalt: z.string().min(1),
  quelle: z.string().min(1).nullable(),
})

export const kbgFristSchema = z.object({
  key: z.string().min(1),
  bezeichnung: z.string().min(1),
  wann: z.string().min(1),
  /** Lebensmonat, bis zu dem der Nachweis vorliegen muss – null = an den Antrag gebunden. */
  bisMonaten: z.number().int().min(0).nullable().optional(),
  quelle: z.string().min(1).nullable(),
})

export const untersuchungenSchema = herkunft.extend({
  mutter: z.object({
    anzahl: z.number().int().min(1),
    hinweis: z.string().min(1),
    quelle: z.string().min(1).nullable(),
  }),
  kind: z.array(untersuchungSchema).min(1),
  kbg: z.object({
    hinweis: z.string().min(1),
    kuerzungEuro: z.number().int().min(0),
    fristen: z.array(kbgFristSchema).min(1),
  }),
})

export type Fenster = z.infer<typeof fensterSchema>
export type Impfung = z.infer<typeof impfungSchema>
export type Impfplan = z.infer<typeof impfplanSchema>
export type Untersuchung = z.infer<typeof untersuchungSchema>
export type KbgFrist = z.infer<typeof kbgFristSchema>
export type Untersuchungen = z.infer<typeof untersuchungenSchema>

/** Die beiden Kategorien, unter denen ein erledigter Eintrag gespeichert wird. */
export const VORSORGE_KINDS = ['impfung', 'untersuchung'] as const
export type VorsorgeKind = (typeof VORSORGE_KINDS)[number]
