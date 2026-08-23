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

## Sprachregister

Die App wird von zwei übermüdeten Menschen benutzt, die gerade Eltern geworden
sind. Sie ist ein Protokoll, kein Ratgeber und kein Bewertungssystem. Daraus
folgt für jeden Text – neuen wie bestehenden:

**Beschreibend statt anweisend.** Die App weiß, was zuletzt war. Sie weiß
nicht, was jetzt zu tun ist.

- „Ungefähr ab 13:40 könnte Müdigkeit kommen" – nicht „Nächster Schlaf: 13:40"
- „Zuletzt lagen dazwischen etwa 1 Std 45" – nicht „Wachfenster: 1:45"
- kein Imperativ, kein „jetzt", kein Countdown auf eine Handlung

**Spannen statt Punktwerte.** Wo ein Vergleichswert unvermeidlich ist, steht er
als Bereich und mit dem Hinweis, dass die Spanne breit ist. Kein Sollwert neben
dem tatsächlichen, kein Prozentsatz auf dessen Erfüllung, keine Prozentzahl auf
eine Vermutung.

**Kein Soll, keine Wertung.** Nichts ist überfällig, nichts fehlt, niemand
liegt zurück. „Übermüdet" ist eine Diagnose, „länger wach als sonst" eine
Feststellung. Rot und Orange sind medizinischen Warnzeichen vorbehalten – nicht
Abweichungen von einer Vorgabe.

**Keine Ausrufezeichen.** Auch nicht als Ermunterung.

**Leere Zustände sind neutral.** „Für heute noch nichts eingetragen." – nicht
„Du hast heute noch nichts eingetragen." Keine Aufforderung, die Lücke zu
schließen; leere Zellen bleiben leer statt zu einer Null zu werden.

**Nichts belohnt Vollständigkeit.** Keine Serien, keine Fortschrittsbalken auf
Tagesziele, keine Abzeichen, keine Zähler der Form „x von y".

**Jede Vorhersage trägt ihren Satz.** Auf jeder Ansicht, die etwas vorhersagt,
steht fest und nicht ausblendbar:

> Das ist aus euren bisherigen Einträgen gerechnet. Euer Kind kennt seinen
> Rhythmus besser als die App.

Die Texte des Schlafbereichs stehen gesammelt in `src/lib/sleep/wording.ts`,
damit sich diese Regeln testen lassen statt nur zu gelten.
