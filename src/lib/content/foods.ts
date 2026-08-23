/**
 * „Darf ich das essen?“ – Lebensmittel in der Schwangerschaft.
 *
 * Die Einordnung folgt den Empfehlungen der AGES (Listerien, Toxoplasmose,
 * sicheres Garen) und des oesterreichischen Gesundheitsportals. Die Texte sind
 * eigenformuliert; uebernommen sind nur die fachlichen Aussagen.
 *
 * Bewusst kein Foto-Scanner: Ein Bild zu erkennen hiesse, es an einen fremden
 * Dienst zu schicken – genau das soll diese App nicht. Die Suche hier findet
 * dasselbe in unter einer Sekunde, offline, und sagt zusaetzlich, worauf es
 * bei der Zubereitung ankommt.
 *
 * Grundsatz der Einordnung:
 *   ok    – unbedenklich, wenn die allgemeinen Hygieneregeln eingehalten sind
 *   care  – kommt auf die Zubereitung, die Menge oder die Herkunft an
 *   avoid – in der Schwangerschaft besser gar nicht
 */

export const FOOD_VERDICTS = ['ok', 'care', 'avoid'] as const
export type FoodVerdict = (typeof FOOD_VERDICTS)[number]

export const VERDICT_LABEL: Record<FoodVerdict, string> = {
  ok: 'Ja',
  care: 'Kommt darauf an',
  avoid: 'Besser nicht',
}

export const VERDICT_HINT: Record<FoodVerdict, string> = {
  ok: 'Unbedenklich, wenn frisch und sauber zubereitet.',
  care: 'Erlaubt – aber nur unter einer Bedingung. Lies den Hinweis.',
  avoid: 'In der Schwangerschaft weglassen.',
}

export const FOOD_GROUPS = [
  'Milch & Käse',
  'Fleisch & Wurst',
  'Fisch & Meeresfrüchte',
  'Eier',
  'Obst & Gemüse',
  'Getränke',
  'Süßes & Sonstiges',
] as const
export type FoodGroup = (typeof FOOD_GROUPS)[number]

export type Food = {
  key: string
  name: string
  group: FoodGroup
  verdict: FoodVerdict
  /** Ein Satz: warum diese Einordnung. */
  why: string
  /** Konkret: was die Sache sicher macht. */
  how?: string
  /** Weitere Schreibweisen und Synonyme – nur fuer die Suche. */
  aka?: string[]
}

export const FOODS: Food[] = [
  // ------------------------------------------------------------ Milch & Käse
  {
    key: 'milch-pasteurisiert',
    name: 'Milch (pasteurisiert)',
    group: 'Milch & Käse',
    verdict: 'ok',
    why: 'Pasteurisierte Milch ist erhitzt, Listerien überleben das nicht.',
    aka: ['Vollmilch', 'H-Milch', 'Frischmilch', 'Magermilch'],
  },
  {
    key: 'rohmilch',
    name: 'Rohmilch',
    group: 'Milch & Käse',
    verdict: 'avoid',
    why: 'Nicht erhitzt, kann Listerien enthalten.',
    how: 'Abgekocht ist sie in Ordnung – einmal sprudelnd aufkochen.',
    aka: ['Vorzugsmilch', 'Milch ab Hof', 'Bauernmilch'],
  },
  {
    key: 'hartkaese',
    name: 'Hartkäse',
    group: 'Milch & Käse',
    verdict: 'ok',
    why: 'Wenig Wasser, hoher Salzgehalt – Listerien vermehren sich darin praktisch nicht.',
    how: 'Rinde großzügig wegschneiden, auch bei gutem Käse.',
    aka: ['Bergkäse', 'Parmesan', 'Grana Padano', 'Emmentaler', 'Gruyère', 'Pecorino'],
  },
  {
    key: 'weichkaese-weissschimmel',
    name: 'Weichkäse mit Weißschimmel',
    group: 'Milch & Käse',
    verdict: 'avoid',
    why: 'Feucht und mild – ideale Bedingungen für Listerien, auch wenn die Milch pasteurisiert war.',
    how: 'Durcherhitzt, bis er richtig blubbert (überbacken), ist er in Ordnung.',
    aka: ['Camembert', 'Brie', 'Chaource'],
  },
  {
    key: 'blauschimmelkaese',
    name: 'Blauschimmelkäse',
    group: 'Milch & Käse',
    verdict: 'avoid',
    why: 'Gleiches Risiko wie Weißschimmelkäse.',
    how: 'In einer Sauce richtig aufgekocht ist er in Ordnung.',
    aka: ['Gorgonzola', 'Roquefort', 'Stilton'],
  },
  {
    key: 'rotschmierkaese',
    name: 'Rotschmierkäse',
    group: 'Milch & Käse',
    verdict: 'avoid',
    why: 'Die geschmierte Rinde ist besonders anfällig für Listerien.',
    aka: ['Limburger', 'Munster', 'Romadur', 'Weinkäse'],
  },
  {
    key: 'feta',
    name: 'Feta',
    group: 'Milch & Käse',
    verdict: 'care',
    why: 'Aus pasteurisierter Milch unbedenklich, aus Rohmilch nicht.',
    how: 'Auf der Packung nach „pasteurisiert“ schauen. Offene Ware aus dem Kübel lieber weglassen.',
    aka: ['Schafkäse', 'Hirtenkäse', 'Balkankäse'],
  },
  {
    key: 'mozzarella',
    name: 'Mozzarella',
    group: 'Milch & Käse',
    verdict: 'care',
    why: 'Der übliche Kuhmilch-Mozzarella ist pasteurisiert, Büffelmozzarella nicht immer.',
    how: 'Packung prüfen. Auf der Pizza ist beides kein Thema.',
    aka: ['Büffelmozzarella', 'Burrata'],
  },
  {
    key: 'frischkaese',
    name: 'Frischkäse & Topfen',
    group: 'Milch & Käse',
    verdict: 'ok',
    why: 'Aus pasteurisierter Milch, industriell abgefüllt.',
    how: 'Nach dem Öffnen zügig aufbrauchen und kühl halten.',
    aka: ['Quark', 'Skyr', 'Hüttenkäse', 'Cottage Cheese', 'Ricotta', 'Mascarpone'],
  },
  {
    key: 'joghurt',
    name: 'Joghurt',
    group: 'Milch & Käse',
    verdict: 'ok',
    why: 'Aus pasteurisierter Milch – auch mit lebenden Kulturen unbedenklich.',
    aka: ['Naturjoghurt', 'Fruchtjoghurt', 'Kefir'],
  },
  {
    key: 'geriebener-kaese',
    name: 'Geriebener Käse (offen)',
    group: 'Milch & Käse',
    verdict: 'care',
    why: 'Große Oberfläche, oft lange offen – Keime haben es leicht.',
    how: 'Verpackte Ware nehmen, kühl lagern, erhitzt verwenden.',
  },
  {
    key: 'softeis',
    name: 'Softeis',
    group: 'Milch & Käse',
    verdict: 'avoid',
    why: 'Softeismaschinen sind schwer zu reinigen und ein bekanntes Listerien-Risiko.',
    how: 'Industriell verpacktes Eis aus der Tiefkühltruhe ist unbedenklich.',
    aka: ['Eis aus der Maschine', 'Frozen Yogurt'],
  },
  {
    key: 'speiseeis-verpackt',
    name: 'Verpacktes Speiseeis',
    group: 'Milch & Käse',
    verdict: 'ok',
    why: 'Industriell aus pasteurisierten Zutaten hergestellt und durchgehend tiefgekühlt.',
  },

  // --------------------------------------------------------- Fleisch & Wurst
  {
    key: 'fleisch-durchgegart',
    name: 'Fleisch, durchgegart',
    group: 'Fleisch & Wurst',
    verdict: 'ok',
    why: 'Durchgaren tötet Toxoplasmen und Listerien zuverlässig ab.',
    how: 'Kein Rosa mehr in der Mitte, Fleischsaft klar.',
    aka: ['Schwein', 'Rind', 'Kalb', 'Lamm', 'Schnitzel', 'Braten', 'Gulasch'],
  },
  {
    key: 'steak-rosa',
    name: 'Steak rosa oder blutig',
    group: 'Fleisch & Wurst',
    verdict: 'avoid',
    why: 'Im Inneren bleibt es roh – Toxoplasmose-Risiko.',
    how: 'Well done bestellen, dann passt es.',
    aka: ['medium', 'rare', 'englisch', 'Roastbeef'],
  },
  {
    key: 'faschiertes-roh',
    name: 'Rohes Faschiertes',
    group: 'Fleisch & Wurst',
    verdict: 'avoid',
    why: 'Rohes Hackfleisch ist das klassische Risikolebensmittel für Toxoplasmose und Listerien.',
    aka: ['Tartar', 'Mett', 'Beef Tatar', 'Cevapcici roh'],
  },
  {
    key: 'rohschinken',
    name: 'Rohschinken & Speck',
    group: 'Fleisch & Wurst',
    verdict: 'avoid',
    why: 'Luftgetrocknet, nicht erhitzt – kann Toxoplasmen enthalten.',
    how: 'Auf der Pizza mitgebacken oder in der Pfanne knusprig gebraten ist er in Ordnung.',
    aka: ['Prosciutto', 'Serrano', 'Parmaschinken', 'Speck', 'Bauchspeck', 'Bündnerfleisch'],
  },
  {
    key: 'rohwurst',
    name: 'Salami & Rohwurst',
    group: 'Fleisch & Wurst',
    verdict: 'avoid',
    why: 'Wird nicht erhitzt, sondern gereift.',
    how: 'Auf der heißen Pizza mitgebacken kein Problem.',
    aka: ['Landjäger', 'Kantwurst', 'Chorizo', 'Mettwurst', 'Teewurst'],
  },
  {
    key: 'bruehwurst',
    name: 'Extrawurst, Frankfurter & Co.',
    group: 'Fleisch & Wurst',
    verdict: 'care',
    why: 'Beim Herstellen erhitzt, kann aber beim Aufschneiden wieder verkeimen.',
    how: 'Frisch aufgeschnitten und rasch essen – oder kurz erhitzen. Offene Reste nach zwei Tagen weg.',
    aka: ['Wiener', 'Leberkäse', 'Krakauer', 'Bierschinken', 'Kochschinken', 'Aufschnitt'],
  },
  {
    key: 'leber',
    name: 'Leber',
    group: 'Fleisch & Wurst',
    verdict: 'care',
    why: 'Sehr viel Vitamin A – in großen Mengen im ersten Drittel für das Kind ungünstig.',
    how: 'Im ersten Trimester weglassen, danach höchstens gelegentlich und gut durchgegart.',
    aka: ['Leberknödel', 'Kalbsleber'],
  },
  {
    key: 'leberstreichwurst',
    name: 'Leberstreichwurst & Pastete',
    group: 'Fleisch & Wurst',
    verdict: 'avoid',
    why: 'Doppelt ungünstig: viel Vitamin A und ein bekanntes Listerien-Risiko.',
    aka: ['Leberpastete', 'Pâté', 'Streichwurst'],
  },
  {
    key: 'gefluegel',
    name: 'Geflügel',
    group: 'Fleisch & Wurst',
    verdict: 'ok',
    why: 'Durchgegart unbedenklich – roh ist es ein Salmonellen-Thema.',
    how: 'Kerntemperatur erreichen, kein glasiges Fleisch. Schneidbrett und Hände danach heiß waschen.',
    aka: ['Huhn', 'Hendl', 'Pute', 'Truthahn', 'Ente'],
  },
  {
    key: 'kebab',
    name: 'Kebab & Döner',
    group: 'Fleisch & Wurst',
    verdict: 'care',
    why: 'Am Spieß ist nicht jede Schicht gleich heiß, und der Salat kommt roh dazu.',
    how: 'Nur wenn das Fleisch frisch und richtig heiß ist – im Zweifel woanders essen.',
  },
  {
    key: 'wild',
    name: 'Wild',
    group: 'Fleisch & Wurst',
    verdict: 'care',
    why: 'Durchgegart unbedenklich, kann aber Bleireste aus der Munition enthalten.',
    how: 'Gut durchgaren und nicht zur Hauptfleischquelle machen.',
    aka: ['Reh', 'Hirsch', 'Wildschwein'],
  },

  // -------------------------------------------------- Fisch & Meeresfrüchte
  {
    key: 'seefisch-fett',
    name: 'Fetter Seefisch, gegart',
    group: 'Fisch & Meeresfrüchte',
    verdict: 'ok',
    why: 'Die beste natürliche Quelle für DHA – das Omega-3, das beim Gehirn des Kindes mitbaut.',
    how: 'Ein- bis zweimal pro Woche, durchgegart.',
    aka: ['Lachs', 'Makrele', 'Hering gegart', 'Sardine', 'Forelle'],
  },
  {
    key: 'raeucherfisch',
    name: 'Räucherfisch & Graved Lachs',
    group: 'Fisch & Meeresfrüchte',
    verdict: 'avoid',
    why: 'Kalt geräuchert oder gebeizt heißt: nicht erhitzt. Klassisches Listerien-Lebensmittel.',
    how: 'Mitgebacken in der Quiche oder in heißer Pasta ist er in Ordnung.',
    aka: ['Räucherlachs', 'Stremellachs', 'Graved Lachs', 'Matjes', 'Rollmops'],
  },
  {
    key: 'sushi-roh',
    name: 'Sushi mit rohem Fisch',
    group: 'Fisch & Meeresfrüchte',
    verdict: 'avoid',
    why: 'Roher Fisch kann Listerien und Parasiten enthalten.',
    how: 'Vegetarische Rollen, Garnelen-Nigiri (gekocht) oder Tempura gehen problemlos.',
    aka: ['Sashimi', 'Nigiri', 'Poke Bowl roh', 'Ceviche'],
  },
  {
    key: 'thunfisch',
    name: 'Thunfisch',
    group: 'Fisch & Meeresfrüchte',
    verdict: 'care',
    why: 'Als großer Raubfisch reichert er Quecksilber an.',
    how: 'Höchstens einmal pro Woche, gegart oder aus der Dose.',
  },
  {
    key: 'raubfisch',
    name: 'Große Raubfische',
    group: 'Fisch & Meeresfrüchte',
    verdict: 'avoid',
    why: 'Höchste Quecksilberbelastung aller Speisefische.',
    aka: ['Schwertfisch', 'Hai', 'Marlin', 'Königsmakrele', 'Butterfisch', 'Aal'],
  },
  {
    key: 'muscheln',
    name: 'Muscheln & Austern',
    group: 'Fisch & Meeresfrüchte',
    verdict: 'care',
    why: 'Roh ein deutliches Risiko, gekocht unbedenklich.',
    how: 'Nur durchgegart, und nur Muscheln, die sich beim Kochen geöffnet haben.',
    aka: ['Miesmuscheln', 'Austern', 'Vongole'],
  },
  {
    key: 'garnelen',
    name: 'Garnelen & Scampi',
    group: 'Fisch & Meeresfrüchte',
    verdict: 'ok',
    why: 'Durchgegart unbedenklich.',
    how: 'Bis sie durchgehend undurchsichtig sind. Nicht roh.',
    aka: ['Shrimps', 'Krevetten', 'Scampi', 'Hummer'],
  },
  {
    key: 'fischstaebchen',
    name: 'Fischstäbchen',
    group: 'Fisch & Meeresfrüchte',
    verdict: 'ok',
    why: 'Aus magerem Weißfisch, durchgegart.',
    how: 'Nach Packungsangabe durchbacken, nicht nur außen bräunen.',
  },

  // -------------------------------------------------------------------- Eier
  {
    key: 'ei-hart',
    name: 'Ei, durchgegart',
    group: 'Eier',
    verdict: 'ok',
    why: 'Fest gewordenes Eiweiß und Dotter sind sicher.',
    how: 'Hart gekocht oder gut durchgebraten.',
    aka: ['hartes Ei', 'Rührei', 'Omelett'],
  },
  {
    key: 'ei-weich',
    name: 'Weiches Ei & Spiegelei',
    group: 'Eier',
    verdict: 'care',
    why: 'Flüssiger Dotter kann Salmonellen enthalten.',
    how: 'Dotter mitdurchgaren – dann spricht nichts dagegen.',
    aka: ['weiches Ei', 'pochiertes Ei', 'Frühstücksei', 'Eier Benedict'],
  },
  {
    key: 'rohes-ei',
    name: 'Speisen mit rohem Ei',
    group: 'Eier',
    verdict: 'avoid',
    why: 'Salmonellenrisiko, und in der Schwangerschaft verläuft eine Infektion oft heftiger.',
    how: 'Fertigprodukte aus dem Kühlregal sind mit pasteurisiertem Ei gemacht und in Ordnung.',
    aka: ['Tiramisu', 'Mousse au Chocolat', 'selbstgemachte Mayonnaise', 'Sauce Hollandaise', 'roher Teig', 'Eierlikör'],
  },
  {
    key: 'mayonnaise-industriell',
    name: 'Mayonnaise aus dem Glas',
    group: 'Eier',
    verdict: 'ok',
    why: 'Industriell mit pasteurisiertem Ei hergestellt.',
    how: 'Nach dem Öffnen kühl lagern und zügig aufbrauchen.',
  },

  // ---------------------------------------------------------- Obst & Gemüse
  {
    key: 'obst-gemuese',
    name: 'Obst & Gemüse',
    group: 'Obst & Gemüse',
    verdict: 'ok',
    why: 'Die Basis – nur die Erde daran ist das Thema, nicht das Lebensmittel.',
    how: 'Gründlich unter fließendem Wasser abspülen, bei Bodenfrüchten schälen oder schrubben.',
    aka: ['Salat', 'Karotte', 'Apfel', 'Beeren', 'Erdbeeren', 'Paradeiser', 'Tomate'],
  },
  {
    key: 'vorgeschnittener-salat',
    name: 'Vorgeschnittener Salat',
    group: 'Obst & Gemüse',
    verdict: 'care',
    why: 'Geschnitten, gewaschen, feucht verpackt – Keime vermehren sich in der Tüte.',
    how: 'Zuhause noch einmal waschen und sofort essen. Am Buffet lieber weglassen.',
    aka: ['Salatmischung', 'Salatbar', 'Buffet-Salat', 'Coleslaw'],
  },
  {
    key: 'sprossen',
    name: 'Rohe Sprossen & Keimlinge',
    group: 'Obst & Gemüse',
    verdict: 'avoid',
    why: 'Wachsen warm und feucht – ideale Bedingungen für Keime, die sich nicht abwaschen lassen.',
    how: 'Gut durchgegart in der Pfanne sind sie in Ordnung.',
    aka: ['Alfalfa', 'Mungbohnensprossen', 'Kresse', 'Sojasprossen'],
  },
  {
    key: 'pilze',
    name: 'Pilze',
    group: 'Obst & Gemüse',
    verdict: 'ok',
    why: 'Gegart unbedenklich – roh können an ihnen Erdreste und damit Toxoplasmen haften.',
    how: 'Durchgaren, keine rohen Champignons im Salat. Keine selbst gesammelten ohne sichere Bestimmung.',
  },
  {
    key: 'huelsenfruechte',
    name: 'Hülsenfrüchte',
    group: 'Obst & Gemüse',
    verdict: 'ok',
    why: 'Eisen, Folat und Eiweiß in einem – eines der besten Lebensmittel für die Schwangerschaft.',
    how: 'Immer gut durchgekocht, nie roh eingeweicht essen.',
    aka: ['Linsen', 'Kichererbsen', 'Bohnen', 'Erbsen', 'Hummus'],
  },

  // ------------------------------------------------------------------ Getränke
  {
    key: 'alkohol',
    name: 'Alkohol',
    group: 'Getränke',
    verdict: 'avoid',
    why: 'Es gibt keine Menge, die als sicher gilt – Alkohol geht direkt zum Kind.',
    how: 'Auch beim Kochen: was nicht lange kocht, behält Restalkohol.',
    aka: ['Wein', 'Bier', 'Sekt', 'Schnaps', 'Cocktail', 'Prosecco'],
  },
  {
    key: 'alkoholfreies-bier',
    name: 'Alkoholfreies Bier & Wein',
    group: 'Getränke',
    verdict: 'care',
    why: '„Alkoholfrei“ heißt in Österreich bis zu 0,5 % Restalkohol.',
    how: 'Wenn, dann Produkte mit 0,0 % – die gibt es inzwischen für beides.',
  },
  {
    key: 'kaffee',
    name: 'Kaffee',
    group: 'Getränke',
    verdict: 'care',
    why: 'Koffein geht zum Kind, das es viel langsamer abbaut als du.',
    how: 'Zwei bis drei Tassen am Tag gelten als vertretbar – Cola und Schokolade zählen mit.',
    aka: ['Espresso', 'Melange', 'Cappuccino', 'Latte'],
  },
  {
    key: 'tee-schwarz-gruen',
    name: 'Schwarz- & Grüntee',
    group: 'Getränke',
    verdict: 'care',
    why: 'Enthält ebenfalls Koffein und bremst zusätzlich die Eisenaufnahme.',
    how: 'Bis zu vier Tassen am Tag, aber nicht direkt zu einer eisenreichen Mahlzeit.',
  },
  {
    key: 'energydrink',
    name: 'Energydrinks',
    group: 'Getränke',
    verdict: 'avoid',
    why: 'Sehr viel Koffein pro Dose, dazu Zusätze ohne Nutzen für dich.',
  },
  {
    key: 'kraeutertee',
    name: 'Kräutertee',
    group: 'Getränke',
    verdict: 'care',
    why: 'Die meisten sind unbedenklich, einige Kräuter wirken aber auf die Gebärmutter.',
    how: 'Sorten abwechseln statt literweise dieselbe. Bei Salbei, Zimt und Süßholz zurückhaltend sein.',
  },
  {
    key: 'himbeerblaettertee',
    name: 'Himbeerblättertee',
    group: 'Getränke',
    verdict: 'care',
    why: 'Wird zur Geburtsvorbereitung getrunken, weil er die Gebärmuttermuskulatur beeinflussen soll.',
    how: 'Nicht in der frühen Schwangerschaft. Wenn, dann zum Ende hin und vorher mit der Hebamme abgesprochen.',
  },
  {
    key: 'leitungswasser',
    name: 'Leitungswasser',
    group: 'Getränke',
    verdict: 'ok',
    why: 'In Österreich Trinkwasserqualität – und du brauchst jetzt mehr davon als sonst.',
    how: 'Morgens kurz ablaufen lassen, wenn die Leitung lange stand.',
  },

  // ------------------------------------------------------- Süßes & Sonstiges
  {
    key: 'honig',
    name: 'Honig',
    group: 'Süßes & Sonstiges',
    verdict: 'ok',
    why: 'Für dich unbedenklich – Honig ist in der Schwangerschaft kein Risiko.',
    how: 'Wichtig fürs erste Jahr danach: Babys unter zwölf Monaten dürfen keinen Honig – Gefahr von Säuglingsbotulismus.',
  },
  {
    key: 'lakritze',
    name: 'Lakritze',
    group: 'Süßes & Sonstiges',
    verdict: 'care',
    why: 'Süßholz kann in größeren Mengen den Blutdruck heben.',
    how: 'Gelegentlich ein Stück ist kein Problem, die Tüte am Abend schon.',
  },
  {
    key: 'nuesse',
    name: 'Nüsse & Samen',
    group: 'Süßes & Sonstiges',
    verdict: 'ok',
    why: 'Gute Fette, Eisen und Magnesium. Nüsse zu meiden beugt keiner Allergie vor.',
    aka: ['Walnuss', 'Mandel', 'Haselnuss', 'Leinsamen', 'Chia'],
  },
  {
    key: 'reste',
    name: 'Aufgewärmte Reste',
    group: 'Süßes & Sonstiges',
    verdict: 'care',
    why: 'Was zu lange lauwarm steht, wird zur Keimkultur.',
    how: 'Rasch abkühlen, kühl lagern, innerhalb von zwei Tagen essen und richtig heiß aufwärmen – einmal, nicht dreimal.',
  },
  {
    key: 'nahrungsergaenzung',
    name: 'Nahrungsergänzung',
    group: 'Süßes & Sonstiges',
    verdict: 'care',
    why: 'Folsäure und Jod sind empfohlen, „Schwangerschafts-Komplexe“ enthalten oft deutlich mehr.',
    how: 'Zu viel Vitamin A ist schädlich. Was du nimmst, gehört auf den Tisch der Ärztin.',
    aka: ['Vitamine', 'Supplement', 'Folsäure', 'Kombipräparat'],
  },
]

/** Grundregeln, die für alles gelten – unabhängig vom einzelnen Lebensmittel. */
export const FOOD_RULES: { title: string; text: string }[] = [
  {
    title: 'Waschen',
    text: 'Obst, Beeren und Gemüse gründlich unter fließendem Leitungswasser abspülen – auch das, was du schälst.',
  },
  {
    title: 'Durchgaren',
    text: 'Fleisch und Fisch bis in die Mitte heiß. Kein Rosa, kein glasiger Kern.',
  },
  {
    title: 'Trennen',
    text: 'Eigenes Brett für rohes Fleisch, Hände und Messer danach heiß waschen.',
  },
  {
    title: 'Kühl halten',
    text: 'Kühlkette nicht unterbrechen, Mindesthaltbarkeit ernst nehmen, offene Ware zügig aufbrauchen.',
  },
  {
    title: 'Katzenklo und Garten',
    text: 'Toxoplasmen kommen auch über Erde und Katzenkot. Gartenarbeit mit Handschuhen, das Katzenklo macht wer anderer.',
  },
]

/** Suche über Name, Synonyme und Gruppe. Ohne Treffer: leere Liste. */
export function searchFoods(query: string): Food[] {
  const needle = query.trim().toLowerCase()
  if (needle.length < 2) return []

  const score = (food: Food): number => {
    const name = food.name.toLowerCase()
    if (name === needle) return 0
    if (name.startsWith(needle)) return 1
    if (name.includes(needle)) return 2
    const aka = (food.aka ?? []).map((entry) => entry.toLowerCase())
    if (aka.some((entry) => entry === needle || entry.startsWith(needle))) return 3
    if (aka.some((entry) => entry.includes(needle))) return 4
    if (food.group.toLowerCase().includes(needle)) return 5
    return Number.POSITIVE_INFINITY
  }

  return FOODS.map((food) => ({ food, rank: score(food) }))
    .filter((entry) => Number.isFinite(entry.rank))
    .sort((a, b) => a.rank - b.rank || a.food.name.localeCompare(b.food.name, 'de'))
    .map((entry) => entry.food)
}

export function foodsByGroup(group: FoodGroup): Food[] {
  return FOODS.filter((food) => food.group === group)
}
