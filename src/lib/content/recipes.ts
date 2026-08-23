/**
 * Rezepte fuers Wochenbett.
 *
 * Auswahlkriterien, alle drei muessen erfuellt sein: in hoechstens 15 Minuten
 * fertig (oder vorher eingefroren), mit einer Hand essbar, und mit Zutaten,
 * die im Wochenbett zaehlen – Eisen, Eiweiss, Ballaststoffe, Fluessigkeit.
 *
 * Alle Rezepte sind selbst zusammengestellt und bewusst simpel gehalten:
 * Wer nachts um drei stillt, kocht nicht nach Rezept, sondern nach Gedaechtnis.
 */

export const RECIPE_TAGS = [
  'einhändig',
  'ohne Kochen',
  'vorkochen & einfrieren',
  'eisenreich',
  'stillfreundlich',
  'für den Vorrat',
] as const
export type RecipeTag = (typeof RECIPE_TAGS)[number]

export type Recipe = {
  key: string
  title: string
  /** Aktive Zeit in Minuten. */
  minutes: number
  tags: RecipeTag[]
  /** Warum es im Wochenbett taugt – ein Satz. */
  why: string
  ingredients: string[]
  steps: string[]
  tip?: string
}

export const RECIPES: Recipe[] = [
  {
    key: 'overnight-oats',
    title: 'Overnight Oats mit Beeren',
    minutes: 5,
    tags: ['einhändig', 'ohne Kochen', 'eisenreich'],
    why: 'Abends in zwei Minuten gemacht, morgens fertig – Haferflocken liefern Eisen, das Obst das Vitamin C dazu.',
    ingredients: [
      '5 EL Haferflocken',
      '150 g Joghurt oder Skyr',
      '100 ml Milch',
      '1 Handvoll Beeren (auch tiefgekühlt)',
      '1 TL Honig',
      '1 EL gehackte Nüsse',
    ],
    steps: [
      'Haferflocken, Joghurt und Milch in ein Glas mit Deckel geben und umrühren.',
      'Beeren und Honig dazu, Deckel drauf, über Nacht in den Kühlschrank.',
      'Morgens die Nüsse darüberstreuen und direkt aus dem Glas essen.',
    ],
    tip: 'Gleich drei Gläser auf einmal ansetzen, dann ist das Frühstück für drei Tage erledigt.',
  },
  {
    key: 'energiekugeln',
    title: 'Energiekugeln',
    minutes: 15,
    tags: ['einhändig', 'ohne Kochen', 'für den Vorrat', 'eisenreich'],
    why: 'Die klassische Einhand-Nahrung fürs Stillen: eine Kugel, ein Bissen, kein Besteck.',
    ingredients: [
      '200 g Datteln, entsteint',
      '100 g Haferflocken',
      '100 g Nüsse oder Mandeln',
      '2 EL Kakao',
      '2 EL Kokosflocken oder Sesam zum Wälzen',
      '1 Prise Salz',
    ],
    steps: [
      'Datteln zehn Minuten in heißem Wasser einweichen, dann abgießen.',
      'Alles außer den Kokosflocken im Mixer zu einer klebrigen Masse verarbeiten.',
      'Mit feuchten Händen walnussgroße Kugeln formen und in Kokosflocken wälzen.',
      'Im Kühlschrank halten sie zwei Wochen, eingefroren drei Monate.',
    ],
    tip: 'Eine Dose davon gehört in die Kliniktasche.',
  },
  {
    key: 'topfenbrot',
    title: 'Vollkornbrot mit Topfen und Ei',
    minutes: 7,
    tags: ['einhändig', 'eisenreich'],
    why: 'Eiweiß, Eisen und Ballaststoffe auf einer Scheibe – in der Zeit fertig, die das Ei zum Kochen braucht.',
    ingredients: [
      '2 Scheiben Vollkornbrot',
      '3 EL Topfen',
      '1 hart gekochtes Ei',
      'Schnittlauch oder Kresse',
      'Salz, Pfeffer',
      'ein paar Kürbiskerne',
    ],
    steps: [
      'Ei kochen – oder eines nehmen, das schon im Kühlschrank liegt.',
      'Topfen mit Salz und Pfeffer verrühren und aufs Brot streichen.',
      'Ei in Scheiben darauflegen, Kürbiskerne und Kräuter darüber.',
    ],
    tip: 'Sonntags sechs Eier hart kochen, dann sind sie die ganze Woche griffbereit.',
  },
  {
    key: 'linsensuppe',
    title: 'Linsensuppe für den Vorrat',
    minutes: 15,
    tags: ['vorkochen & einfrieren', 'eisenreich', 'für den Vorrat'],
    why: 'Das beste Wochenbett-Essen überhaupt: warm, sättigend, eisenreich und aus dem Gefrierfach in zehn Minuten wieder da.',
    ingredients: [
      '250 g rote Linsen',
      '1 Zwiebel, 2 Karotten, 1 Stück Sellerie',
      '1 EL Tomatenmark',
      '1,2 l Gemüsebrühe',
      '1 TL Kreuzkümmel, 1 TL Paprikapulver',
      'Saft einer halben Zitrone',
    ],
    steps: [
      'Gemüse klein schneiden und in Öl fünf Minuten anschwitzen, Tomatenmark kurz mitrösten.',
      'Linsen, Gewürze und Brühe dazugeben, aufkochen und 12 Minuten köcheln lassen.',
      'Mit Zitronensaft abschmecken – der bringt das Eisen aus den Linsen erst richtig zur Geltung.',
      'In Portionen abfüllen, abkühlen lassen und einfrieren.',
    ],
    tip: 'Doppelte Menge machen. Sechs Portionen im Gefrierfach sind die erste Woche gerettet.',
  },
  {
    key: 'ofengemuese',
    title: 'Blech mit Ofengemüse und Kichererbsen',
    minutes: 10,
    tags: ['vorkochen & einfrieren', 'stillfreundlich'],
    why: 'Zehn Minuten Arbeit, dreißig Minuten Ofen, in denen du liegen kannst. Reste schmecken kalt genauso.',
    ingredients: [
      '1 kg Gemüse nach Vorrat (Karotten, Kürbis, Erdäpfel, Paprika)',
      '1 Dose Kichererbsen, abgespült',
      '3 EL Olivenöl',
      'Salz, Paprikapulver, Rosmarin',
      '150 g Feta (pasteurisiert) zum Darüberbröseln',
    ],
    steps: [
      'Ofen auf 200 °C vorheizen.',
      'Gemüse grob würfeln, mit Kichererbsen, Öl und Gewürzen auf einem Blech vermengen.',
      '30 Minuten backen, nach der Hälfte einmal wenden.',
      'Feta darüberbröseln und noch fünf Minuten backen.',
    ],
  },
  {
    key: 'porridge',
    title: 'Porridge mit Apfel und Zimt',
    minutes: 8,
    tags: ['einhändig', 'eisenreich', 'stillfreundlich'],
    why: 'Warm, weich und schnell – und Haferflocken sind eines der wenigen Frühstücke mit nennenswert Eisen.',
    ingredients: [
      '60 g Haferflocken',
      '250 ml Milch oder Wasser',
      '1 Apfel, gerieben',
      '1 Prise Zimt und Salz',
      '1 EL Mandelmus',
    ],
    steps: [
      'Haferflocken mit Milch und Salz aufkochen, drei bis fünf Minuten quellen lassen.',
      'Geriebenen Apfel und Zimt unterrühren.',
      'Mandelmus obendrauf – das macht satt und liefert Kalzium.',
    ],
  },
  {
    key: 'smoothie',
    title: 'Bananen-Erdnuss-Shake',
    minutes: 3,
    tags: ['einhändig', 'ohne Kochen', 'stillfreundlich'],
    why: 'Wenn keine Hand frei ist zum Kauen: Kalorien, Eiweiß und Flüssigkeit in einem Glas.',
    ingredients: [
      '1 reife Banane',
      '250 ml Milch',
      '1 EL Erdnussmus',
      '2 EL Haferflocken',
      '1 Prise Zimt',
    ],
    steps: ['Alles in den Mixer.', 'Eine Minute mixen.', 'Mit Strohhalm neben den Stillplatz stellen.'],
  },
  {
    key: 'reispfanne',
    title: 'Reispfanne mit Ei',
    minutes: 10,
    tags: ['eisenreich'],
    why: 'Verwertet Reste vom Vortag und ist warm auf dem Tisch, bevor das Baby es merkt.',
    ingredients: [
      '2 Portionen gekochter Reis vom Vortag',
      '2 Eier',
      '1 Handvoll Tiefkühlerbsen',
      '1 Karotte, klein gewürfelt',
      'Sojasauce, Sesamöl',
    ],
    steps: [
      'Karotte und Erbsen in etwas Öl drei Minuten anbraten.',
      'Reis dazu, kräftig anbraten, bis er heiß ist.',
      'Zur Seite schieben, Eier in die freie Pfannenhälfte geben und stocken lassen, dann unterrühren.',
      'Mit Sojasauce und ein paar Tropfen Sesamöl abschmecken.',
    ],
    tip: 'Wichtig: Reis vom Vortag gehört sofort nach dem Kochen kühl gestellt und muss beim Aufwärmen richtig heiß werden.',
  },
  {
    key: 'wrap',
    title: 'Kalter Wrap für die Nacht',
    minutes: 5,
    tags: ['einhändig', 'ohne Kochen'],
    why: 'Am Abend gemacht, in Folie gewickelt neben das Bett – das Essen für die Drei-Uhr-Mahlzeit.',
    ingredients: [
      '1 Vollkorn-Tortilla',
      '2 EL Hummus oder Frischkäse',
      '1 Handvoll Blattsalat, gewaschen',
      'gekochtes Hühnerfleisch oder hart gekochtes Ei',
      'geriebene Karotte',
    ],
    steps: [
      'Tortilla bestreichen, alles in die Mitte legen.',
      'Unten einschlagen, dann seitlich fest einrollen.',
      'In Backpapier wickeln – so hält er im Kühlschrank bis zum nächsten Tag und krümelt nicht ins Bett.',
    ],
  },
  {
    key: 'huehnersuppe',
    title: 'Klare Hühnersuppe',
    minutes: 15,
    tags: ['vorkochen & einfrieren', 'für den Vorrat', 'stillfreundlich'],
    why: 'Das Klassiker-Essen fürs Wochenbett: warm, salzig, leicht verdaulich und Flüssigkeit obendrein.',
    ingredients: [
      '1 Suppenhuhn oder 4 Hühnerschenkel',
      '2 Karotten, 1 Petersilwurzel, 1 Stück Lauch',
      '1 Zwiebel, halbiert und ohne Fett angeröstet',
      'Salz, Pfefferkörner, Liebstöckel',
      'Nudeln oder Frittaten zum Servieren',
    ],
    steps: [
      'Huhn kalt aufsetzen, aufkochen, Schaum abschöpfen.',
      'Gemüse und Gewürze dazu, 90 Minuten leise ziehen lassen – dabei musst du nichts tun.',
      'Fleisch herauslösen, Suppe abseihen, salzen.',
      'In Portionen einfrieren, das Fleisch getrennt.',
    ],
    tip: 'Das ist das Rezept für die letzten Schwangerschaftswochen, nicht fürs Wochenbett selbst. Vorher machen, danach nur auftauen.',
  },
  {
    key: 'griessbrei',
    title: 'Grießbrei',
    minutes: 8,
    tags: ['einhändig', 'stillfreundlich'],
    why: 'Warm, süß, in acht Minuten fertig und liefert Kalzium – das Trostessen mit Nährwert.',
    ingredients: ['500 ml Milch', '60 g Grieß', '1 EL Zucker oder Honig', '1 Prise Salz', 'Kompott oder Beeren'],
    steps: [
      'Milch mit Zucker und Salz aufkochen.',
      'Grieß unter Rühren einrieseln lassen, kurz aufkochen.',
      'Vom Herd nehmen und fünf Minuten quellen lassen, Kompott darüber.',
    ],
  },
  {
    key: 'pasta-aglio',
    title: 'Pasta mit Öl, Knoblauch und Parmesan',
    minutes: 12,
    tags: ['stillfreundlich'],
    why: 'Wenn nichts mehr da ist, ist das noch da. Und es geht mit einer Hand am Herd.',
    ingredients: [
      '200 g Vollkornnudeln',
      '3 EL Olivenöl',
      '2 Knoblauchzehen, in Scheiben',
      'Chiliflocken nach Belieben',
      'geriebener Parmesan',
      'Petersilie',
    ],
    steps: [
      'Nudeln nach Packung kochen, eine Tasse Kochwasser aufheben.',
      'Knoblauch im Öl bei mittlerer Hitze goldgelb werden lassen, nicht braun.',
      'Nudeln, etwas Kochwasser und Parmesan dazugeben und schwenken, bis es cremig ist.',
    ],
  },
  {
    key: 'kartoffelsuppe',
    title: 'Kartoffel-Lauch-Suppe',
    minutes: 15,
    tags: ['vorkochen & einfrieren', 'für den Vorrat'],
    why: 'Billig, sättigend, einfrierbar – und selbst lauwarm noch gut.',
    ingredients: [
      '600 g Erdäpfel',
      '1 Stange Lauch',
      '1 l Gemüsebrühe',
      '100 ml Schlagobers oder Hafercreme',
      'Muskatnuss, Salz, Pfeffer',
    ],
    steps: [
      'Erdäpfel und Lauch grob schneiden, kurz anschwitzen.',
      'Mit Brühe aufgießen und 15 Minuten weich kochen.',
      'Pürieren, Obers unterrühren, mit Muskat abschmecken.',
    ],
  },
  {
    key: 'chiapudding',
    title: 'Chiapudding',
    minutes: 4,
    tags: ['einhändig', 'ohne Kochen', 'stillfreundlich'],
    why: 'Ballaststoffe gegen die Verstopfung, die nach der Geburt fast alle trifft – und er macht sich über Nacht von selbst.',
    ingredients: ['3 EL Chiasamen', '250 ml Milch oder Pflanzendrink', '1 TL Honig', 'Obst nach Vorrat'],
    steps: [
      'Chiasamen mit Milch und Honig verrühren.',
      'Nach fünf Minuten noch einmal umrühren – das verhindert Klumpen.',
      'Über Nacht kalt stellen, morgens Obst darauf.',
    ],
  },
  {
    key: 'haferkekse',
    title: 'Haferkekse ohne Waage',
    minutes: 12,
    tags: ['einhändig', 'für den Vorrat', 'stillfreundlich'],
    why: 'Drei Zutaten, kein Abwiegen, und sie liegen griffbereit neben dem Stillplatz.',
    ingredients: ['2 reife Bananen', '150 g zarte Haferflocken', '2 EL Nussmus', 'optional Schokostücke oder Rosinen'],
    steps: [
      'Bananen mit der Gabel zerdrücken, Haferflocken und Nussmus untermischen.',
      'Mit einem Löffel kleine Häufchen auf ein Blech setzen und flach drücken.',
      'Bei 180 °C 12 bis 15 Minuten backen.',
    ],
    tip: 'Hält in der Dose eine Woche und lässt sich einfrieren.',
  },
]

export function recipesByTag(tag: RecipeTag): Recipe[] {
  return RECIPES.filter((recipe) => recipe.tags.includes(tag))
}

/** Rezepte, die vor der Geburt gekocht und eingefroren werden sollten. */
export function stockRecipes(): Recipe[] {
  return RECIPES.filter((recipe) => recipe.tags.includes('vorkochen & einfrieren'))
}
