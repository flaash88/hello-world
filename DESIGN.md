# Designsprache – „Warmes Papier“

Ruhig, warm, erwachsen. Kein Klinikweiß, kein Pastellzucker. Die App wird von
übermüdeten Menschen benutzt – Klarheit ist die wichtigste Designentscheidung.

## Farbe

Eine kräftige Akzentfarbe, sonst Sand- und Lehmtöne.

| Rolle | Tag | Nacht |
|---|---|---|
| Grund | `hsl(36 44% 97%)` warmes Papier | `hsl(20 18% 4%)` fast schwarz, warm |
| Text | `hsl(24 24% 16%)` | `hsl(24 40% 78%)` gedämpftes Warmweiß |
| Akzent | `hsl(14 66% 46%)` Terrakotta | `hsl(12 62% 44%)` |
| Karte | Weiß | `hsl(20 16% 8%)` |

Kategoriefarben (Schlaf, Stillen, Flasche, Abpumpen, Beikost, Windel, Stimmung,
Gesundheit, Sonstiges) liegen als eigene CSS-Variablen vor und sind im
Nachtmodus separat entsättigt – nicht bloß abgedunkelt. Alle Text-/Grund-Paare
erfüllen mindestens WCAG AA (4,5:1 für Fließtext, 3:1 für große Typografie).

## Nachtmodus

Kein invertiertes Tagesschema, sondern ein eigener Zustand:

- eigenes Token-Set mit niedriger Leuchtdichte und rot-warmen Akzenten
- reduzierte Oberfläche: nur die laufenden Timer, die Schnellaktionen und der
  letzte Eintrag; Statistiken, Content und Diagramme sind ausgeblendet
- größere Flächen, weniger Text, weniger Kontrastsprünge
- automatisch im eingestellten Fenster (Default 20:00–06:00), pro Gerät
  manuell übersteuerbar (`localStorage`, kein Serverweg nötig)

## Typografie

- **Fließtext:** Nunito (variabel 400–800), selbst gehostet, Latin-Subset
- **Überschriften:** Fraunces (variabel 400–700), warm und leicht literarisch
- Basisgröße 17 px statt 16 px; funktioniert bis Systemschriftgröße 130 %
- Zahlen in Statistiken mit `font-variant-numeric: tabular-nums`

## Form und Raum

- Radien: Karten `1.5rem`, Buttons `1rem` – rund, aber nicht verspielt
- viel Weißraum, maximale Inhaltsbreite 42 rem (Handy zuerst)
- Schatten nur dezent (`shadow-sm`), Struktur entsteht über Rahmen und Fläche

## Bedienung

- Touch-Ziele mindestens 48 px, primäre Aktionen 56–80 px hoch
- Schnellaktionen auf dem Startbildschirm: größte Buttons oben
- laufende Timer immer sichtbar als Leiste über der Tab-Navigation
- jede Aktion mit Toast plus „Rückgängig“
- Navigation: feste Tab-Leiste unten, maximal fünf Ziele

## Bewegung

Dezent und kurz (150–250 ms), nur für Zustandswechsel. `prefers-reduced-motion`
schaltet alle Animationen global ab (in `globals.css` erzwungen).
