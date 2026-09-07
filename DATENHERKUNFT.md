# Datenherkunft und Prüfstand

Welche Daten die App mitbringt, woher sie stammen und was davon nachgeprüft
ist. Stand dieser Prüfung: **7. September 2026**.

Wer Daten ändert, ändert auch die Zeile hier. Eine Zahl ohne Herkunft hat in
dieser App nichts verloren.

## Geprüft und bestätigt

| Bereich | Quelle | Wie geprüft |
|---|---|---|
| Wachstum (Perzentile) | WHO Child Growth Standards, über das npm-Paket `who-growth-standards` | Kontrollpunkte gegen die veröffentlichten WHO-Tabellen: Median und ±2 SD bei Geburt für Gewicht, Länge und Kopfumfang, beide Geschlechter, dazu 12 Monate. Alle Werte stimmen auf vier Nachkommastellen. 0 ungültige LMS-Tripel in 8 × 1857 Punkten. |
| Zähne (Durchbruch und Ausfall) | American Dental Association, Eruption Chart Primary Teeth | Alle zwanzig Spannen gegen die ADA-Tabelle abgeglichen, inklusive der Ausfallzeiten. |
| Muttermilch: Zimmertemperatur, Kühlschrank, Tiefkühler | CDC, Human Milk Storage Guidelines | 4 Stunden / 4 Tage / 6 Monate ideal, bis 12 Monate vertretbar – bestätigt. |
| Familienzeitbonus | Bundeskanzleramt, ÖGK | 54,87 Euro pro Tag, 28 bis 31 zusammenhängende Tage innerhalb der ersten 91 Tage – für 2026 bestätigt (die Valorisierung ist für 2026 und 2027 ausgesetzt). |
| Kinderbetreuungsgeld, Rückwirkung | oesterreich.gv.at | Höchstens 182 Tage rückwirkend – bestätigt. |

## Korrigiert bei dieser Prüfung

**Gefrierfach im Kühlschrank: 6 Monate → 2 Wochen.** Die Vorgabe für den
Lagerort „Gefrierfach" trug die Zahl für eine Tiefkühltruhe. Die CDC nennt für
das Fach im Kühlschrank zwei Wochen, weil dort die −18 °C bei jedem Öffnen
verloren gehen. Wessen Fach die Temperatur wirklich hält, stellt den Wert unter
Einstellungen → Milchvorrat höher.

## Offen – nicht prüfbar aus der Entwicklungsumgebung

Die Netzwerkrichtlinie dieser Umgebung sperrt den Zugriff auf
`gesundheit.gv.at`, `sozialministerium.gv.at`, `oesterreich.gv.at`, `who.int`,
`ages.at` und auch auf die Spiegelung des Impfplans bei
`pii.meduniwien.ac.at` (403 auf CONNECT). Über die Websuche kommen nur
Zusammenfassungen an, keine Originaldokumente. Beides zusammen reicht für eine
Bestätigung nicht aus.

**Eltern-Kind-Pass, Nummerierung ab der vierten Untersuchung.** Recherchen im
September 2026 legen nahe, dass die Untersuchung im 7. bis 9. Lebensmonat die
*vierte* ist und die im 10. bis 14. Lebensmonat die *fünfte* (mit der ersten
Augenuntersuchung). In den Daten steht 7.–9. Lebensmonat als fünfte. Zwei
Recherchen widersprachen sich, deshalb wurde nichts umnummeriert. Der
Eltern-Kind-Pass selbst klärt das in zwei Minuten.

**Impfplan, Feld `kostenfrei`.** Österreich hat das kostenfreie
Kinderimpfprogramm zuletzt erweitert. Für Varizellen und die Kinder-Influenza
deuten die Recherchen darauf hin, dass sie inzwischen enthalten sind; in den
Daten stehen sie noch als kostenpflichtig bzw. unbekannt. Nicht geändert, weil
eine Zusammenfassung kein Impfplan ist.

**Impfplan, Zeitfenster.** Die 16 Einträge wurden nie gegen das Original-PDF
geprüft. Drei Fenster fehlen ganz (`fenster: null`) und sind in der App
entsprechend gekennzeichnet.

Solange `geprueft: false` in den beiden Dateien unter `content/vorsorge/` steht,
zeigt die App den Prüfhinweis sichtbar über der Vorsorgeseite an. Das ist so
gewollt und soll erst verschwinden, wenn jemand die Angaben gegen das
Originaldokument gehalten hat.

## Selbst formuliert, fachlich angelehnt

Die Texte in `src/lib/content/` – Lebensmittel-Check, Ernährung, Wochenbett,
Stillen, Behördenwege, Rezepte, Geburtsvorbereitung, Meilensteine, Sprünge –
sind eigene Formulierungen. Die fachliche Anlehnung steht jeweils im Kopf der
Datei (AGES, Gesundheitsportal, „Richtig essen von Anfang an", CDC,
Arbeiterkammer, ÖGK). Sie sind Orientierung, keine Beratung; jede Auswertung
mit medizinischem Anschein trägt in der App den entsprechenden Hinweis.

Zu den Entwicklungssprüngen steht im Quelltext ausdrücklich, dass die
Sprungtheorie wissenschaftlich umstritten ist und Studien die behaupteten
festen Zeitpunkte nicht bestätigen konnten. Genau so wird sie in der App auch
präsentiert.
