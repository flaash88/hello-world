/**
 * Bestaetigungswort fuers Loeschen. Liegt bewusst ausserhalb der
 * Server-Action-Datei: aus einem 'use server'-Modul darf nur exportiert
 * werden, was eine async Funktion ist.
 */
export const DELETE_CONFIRMATION = 'LÖSCHEN'
