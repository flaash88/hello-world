/**
 * Vorbefuellte Kliniktasche. Wird beim ersten Oeffnen der Liste in die
 * Datenbank kopiert – danach ist alles editierbar, ergaenzbar und loeschbar,
 * und beide sehen denselben Stand.
 */
export type HospitalBagItem = {
  key: string
  section: string
  label: string
  note?: string
  quantity?: string
}

export const HOSPITAL_BAG_SECTIONS = [
  'Unterlagen',
  'Für die Geburt',
  'Für Mama danach',
  'Für das Baby',
  'Für den Partner',
  'Für die Heimfahrt',
] as const

export const HOSPITAL_BAG_TEMPLATE: HospitalBagItem[] = [
  // ------------------------------------------------------------- Unterlagen
  { key: 'ecard', section: 'Unterlagen', label: 'e-card', note: 'Beider Elternteile, falls vorhanden' },
  { key: 'mkp', section: 'Unterlagen', label: 'Mutter-Kind-Pass' },
  { key: 'ausweis', section: 'Unterlagen', label: 'Lichtbildausweis' },
  { key: 'meldezettel', section: 'Unterlagen', label: 'Meldezettel', note: 'Für die Geburtsurkunde' },
  { key: 'heiratsurkunde', section: 'Unterlagen', label: 'Heirats- oder Geburtsurkunde', note: 'Je nach Familienstand' },
  { key: 'vaterschaft', section: 'Unterlagen', label: 'Vaterschaftsanerkennung', note: 'Falls unverheiratet und schon erledigt' },
  { key: 'befunde', section: 'Unterlagen', label: 'Aktuelle Befunde', note: 'Blutgruppe, Allergien, GBS-Abstrich' },
  { key: 'geburtsplan', section: 'Unterlagen', label: 'Geburtsplan', note: 'Falls ihr einen geschrieben habt' },

  // -------------------------------------------------------- Für die Geburt
  { key: 'nachthemd-geburt', section: 'Für die Geburt', label: 'Weites Nachthemd oder langes T-Shirt', note: 'Darf ruinierbar sein' },
  { key: 'socken', section: 'Für die Geburt', label: 'Dicke Socken', quantity: '2 Paar', note: 'Füße werden im Kreißsaal kalt' },
  { key: 'haargummi', section: 'Für die Geburt', label: 'Haargummis und Klammern' },
  { key: 'lippenpflege', section: 'Für die Geburt', label: 'Lippenpflege', note: 'Die Luft im Kreißsaal ist trocken' },
  { key: 'traubenzucker', section: 'Für die Geburt', label: 'Traubenzucker und Müsliriegel' },
  { key: 'getraenk', section: 'Für die Geburt', label: 'Trinkflasche mit Strohhalm', note: 'Im Liegen trinken ist sonst mühsam' },
  { key: 'massageoel', section: 'Für die Geburt', label: 'Massageöl', note: 'Für Kreuzbeinmassage' },
  { key: 'musik', section: 'Für die Geburt', label: 'Kopfhörer und Playlist' },

  // ---------------------------------------------------- Für Mama danach
  { key: 'still-bh', section: 'Für Mama danach', label: 'Still-BHs', quantity: '2–3' },
  { key: 'stilleinlagen', section: 'Für Mama danach', label: 'Stilleinlagen' },
  { key: 'netzhoeschen', section: 'Für Mama danach', label: 'Wegwerf- oder alte Unterhosen', quantity: '5–7', note: 'Hoch geschnitten, dunkel' },
  { key: 'binden', section: 'Für Mama danach', label: 'Wochenbettbinden', note: 'Die Klinik hat meist welche, eigene sind angenehmer' },
  { key: 'nachthemden', section: 'Für Mama danach', label: 'Nachthemden zum Stillen', quantity: '2', note: 'Vorne zu öffnen' },
  { key: 'bequem', section: 'Für Mama danach', label: 'Bequeme Hose und Oberteile', quantity: '2 Sets' },
  { key: 'morgenmantel', section: 'Für Mama danach', label: 'Morgenmantel oder Strickjacke' },
  { key: 'hausschuhe', section: 'Für Mama danach', label: 'Rutschfeste Hausschuhe' },
  { key: 'duschzeug', section: 'Für Mama danach', label: 'Duschgel, Shampoo, Zahnbürste, Zahnpasta' },
  { key: 'handtuch', section: 'Für Mama danach', label: 'Eigenes Handtuch', note: 'Die Klinikhandtücher sind rau' },
  { key: 'brustwarzensalbe', section: 'Für Mama danach', label: 'Brustwarzensalbe', note: 'Lanolin oder Wollwachs' },
  { key: 'ladekabel', section: 'Für Mama danach', label: 'Langes Ladekabel', note: 'Die Steckdose ist immer zu weit weg' },

  // ------------------------------------------------------- Für das Baby
  { key: 'body', section: 'Für das Baby', label: 'Bodys Größe 50/56', quantity: '4–5' },
  { key: 'strampler', section: 'Für das Baby', label: 'Strampler oder Overalls', quantity: '4–5' },
  { key: 'jaeckchen', section: 'Für das Baby', label: 'Jäckchen', quantity: '2' },
  { key: 'muetze', section: 'Für das Baby', label: 'Mütze', quantity: '2', note: 'Über den Kopf geht am meisten Wärme verloren' },
  { key: 'baby-socken', section: 'Für das Baby', label: 'Söckchen', quantity: '3 Paar' },
  { key: 'baby-decke', section: 'Für das Baby', label: 'Leichte Decke oder Puckdecke' },
  { key: 'windeln', section: 'Für das Baby', label: 'Windeln Neugeborenengröße', note: 'Die Klinik stellt meist welche' },
  { key: 'kuscheltuch', section: 'Für das Baby', label: 'Nuckeltuch oder kleines Kuscheltuch' },

  // ---------------------------------------------------- Für den Partner
  { key: 'partner-wechsel', section: 'Für den Partner', label: 'Wechselkleidung und Zahnbürste', note: 'Es kann länger dauern als geplant' },
  { key: 'partner-essen', section: 'Für den Partner', label: 'Essen und Getränke', note: 'Nachts hat kein Automat offen' },
  { key: 'kleingeld', section: 'Für den Partner', label: 'Kleingeld und Parkkarte' },
  { key: 'powerbank', section: 'Für den Partner', label: 'Powerbank' },
  { key: 'kamera', section: 'Für den Partner', label: 'Kamera oder Handy mit freiem Speicher' },
  { key: 'kontaktliste', section: 'Für den Partner', label: 'Liste, wer wann informiert wird' },

  // ------------------------------------------------- Für die Heimfahrt
  { key: 'babyschale', section: 'Für die Heimfahrt', label: 'Babyschale im Auto', note: 'Vorher einmal einbauen und üben' },
  { key: 'heim-outfit', section: 'Für die Heimfahrt', label: 'Anzieh-Set für das Baby', note: 'Der Jahreszeit entsprechend' },
  { key: 'mama-heim', section: 'Für die Heimfahrt', label: 'Kleidung für Mama', note: 'Das, was in der 20. Woche gepasst hat' },
  { key: 'fussack', section: 'Für die Heimfahrt', label: 'Fußsack oder Decke', note: 'Keine dicke Jacke im Autositz' },
]
