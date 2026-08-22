# WHO Child Growth Standards

Die JSON-Dateien in diesem Verzeichnis enthalten die LMS-Parameter der
**WHO Child Growth Standards** (Weight-for-age, Length/height-for-age,
Head-circumference-for-age, BMI-for-age; Jungen und Mädchen, 0–1856 Tage in
Tagesauflösung).

- Quelle: World Health Organization, WHO Child Growth Standards
  <https://www.who.int/tools/child-growth-standards>
- Übernommen aus dem npm-Paket `who-growth-standards` (MIT, Roman Koropets),
  das die offiziellen WHO-Tabellen unverändert bündelt.

Dieses Projekt steht in keinerlei Verbindung zur WHO und ist von ihr weder
geprüft noch bestätigt. Die Berechnung (`src/lib/growth/lms.ts`) ist
eigenständig implementiert; hier liegen ausschließlich die Referenzdaten.

## Format

```jsonc
{
  "indicator": "wfa",     // wfa | lhfa | hcfa | bfa
  "sex": "female",
  "xAxis": "day",         // Einheit der Zeitachse
  "start": 0,             // erster Wert der Zeitachse
  "step": 1,              // Schrittweite
  "lms": [[L, M, S], ...] // je Zeitpunkt, in der Reihenfolge der Zeitachse
}
```
