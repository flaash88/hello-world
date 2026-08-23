/**
 * Woche-fuer-Woche-Inhalte fuer die Schwangerschaft (SSW 4 bis 42).
 *
 * Alle Texte sind eigenformuliert. Die Groessen- und Gewichtsangaben sind
 * gerundete Durchschnittswerte, wie sie in der Praenataldiagnostik ueblich
 * sind: bis SSW 20 als Scheitel-Steiss-Laenge (SSL), danach als Scheitel-Ferse-
 * Laenge (SFL). Sie sind eine grobe Orientierung – gesunde Kinder streuen
 * betraechtlich um diese Werte.
 */

export type PregnancyWeekContent = {
  week: number
  /** Vergleichsobst bzw. -gemuese – bewusst mitteleuropaeisch. */
  comparison: string
  /** Laenge in cm; null in den ersten Wochen, in denen sie nicht sinnvoll ist. */
  lengthCm: number | null
  /** Ob die Laenge Scheitel-Steiss (SSL) oder Scheitel-Ferse (SFL) meint. */
  lengthKind: 'ssl' | 'sfl' | null
  /** Gewicht in Gramm. */
  weightG: number | null
  /** Was in dieser Woche beim Kind passiert. */
  development: string
  /** Was die Mutter spuert bzw. was sich koerperlich veraendert. */
  mother: string
  /** Konkreter Tipp fuer den Partner. */
  partnerTip: string
}

export const PREGNANCY_WEEKS: PregnancyWeekContent[] = [
  {
    week: 4,
    comparison: 'Mohnsamen',
    lengthCm: 0.1,
    lengthKind: 'ssl',
    weightG: null,
    development:
      'Die befruchtete Eizelle hat sich in der Gebärmutterschleimhaut eingenistet. Aus dem winzigen Zellhaufen entstehen jetzt zwei getrennte Bereiche: aus dem einen wird euer Kind, aus dem anderen der Mutterkuchen. Nervensystem, Herz und Darm sind als Zellschichten bereits angelegt, auch wenn noch nichts davon zu erkennen ist.',
    mother:
      'Die Periode bleibt aus – für viele der erste Hinweis. Ein Schwangerschaftstest schlägt jetzt meist an, weil das Schwangerschaftshormon hCG messbar wird. Manche spüren ein leichtes Ziehen im Unterleib oder eine leichte Schmierblutung zum Zeitpunkt der Einnistung.',
    partnerTip:
      'Frag nach, ob sie den Test allein machen möchte oder lieber mit dir. Beides ist völlig in Ordnung – gefragt zu werden ist der eigentliche Punkt.',
  },
  {
    week: 5,
    comparison: 'Sesamkorn',
    lengthCm: 0.2,
    lengthKind: 'ssl',
    weightG: null,
    development:
      'Das Neuralrohr schließt sich – daraus werden Gehirn und Rückenmark. Ein erster Herzschlauch beginnt zu pulsieren, noch lange kein fertiges Herz, aber schon rhythmisch. Die Nabelschnur bildet sich und übernimmt die Versorgung.',
    mother:
      'Müdigkeit ist in dieser Woche oft das auffälligste Zeichen – eine Erschöpfung, die sich anders anfühlt als normales Kurzschlafen. Die Brüste können spannen, der Geruchssinn wird empfindlicher. Folsäure ist jetzt besonders wichtig, falls noch nicht begonnen: Sprich es beim nächsten Termin an.',
    partnerTip:
      'Übernimm still ein paar Abendaufgaben. Nicht ankündigen, einfach machen – Diskussionen kosten in dieser Phase mehr Kraft als die Aufgabe selbst.',
  },
  {
    week: 6,
    comparison: 'Linse',
    lengthCm: 0.4,
    lengthKind: 'ssl',
    weightG: null,
    development:
      'Der Herzschlag ist im Ultraschall als Flimmern sichtbar und liegt bei etwa 110 Schlägen pro Minute. Kopf und Rumpf sind unterscheidbar, an den Seiten wachsen kleine Knospen, aus denen Arme und Beine werden. Die Anlagen für Augen und Ohren zeichnen sich als dunkle Punkte ab.',
    mother:
      'Übelkeit setzt bei vielen jetzt ein, oft nicht nur morgens. Häufige kleine Mahlzeiten helfen mehr als drei große. Der Harndrang nimmt zu, weil die Nieren stärker durchblutet werden.',
    partnerTip:
      'Stell etwas Trockenes neben das Bett – Zwieback, Reiswaffeln, Salzstangen. Vor dem Aufstehen etwas zu essen nimmt der Übelkeit oft die Spitze.',
  },
  {
    week: 7,
    comparison: 'Heidelbeere',
    lengthCm: 1,
    lengthKind: 'ssl',
    weightG: null,
    development:
      'Das Gehirn wächst in dieser Phase besonders schnell – pro Minute entstehen zehntausende Nervenzellen. Die Armknospen bekommen Ansätze für Hände, die noch wie kleine Ruder aussehen. Leber, Bauchspeicheldrüse und Lunge legen ihre ersten Strukturen an.',
    mother:
      'Der Geschmackssinn spielt verrückt: Lieblingsessen kann plötzlich unmöglich sein, und ausgerechnet Saures oder sehr Schlichtes geht am besten. Das ist normal und geht meistens im zweiten Trimester wieder vorbei. Der Muttermund verschließt sich mit einem Schleimpfropf.',
    partnerTip:
      'Frag vor dem Kochen, was heute geht – und nimm ein Nein zu deinem Lieblingsgericht nicht persönlich.',
  },
  {
    week: 8,
    comparison: 'Himbeere',
    lengthCm: 1.6,
    lengthKind: 'ssl',
    weightG: 1,
    development:
      'Aus den Ruderchen werden erkennbare Hände mit Fingeransätzen, die Ellenbogen beugen sich zum ersten Mal. Das Kind bewegt sich bereits ruckartig, spürbar ist davon noch nichts. Die Netzhaut der Augen beginnt Pigment einzulagern.',
    mother:
      'Die Gebärmutter hat etwa die Größe einer Orange, von außen sieht man noch nichts. Kreislaufschwankungen und Schwindel beim schnellen Aufstehen sind häufig. Viele haben jetzt ihren ersten Termin bei der Frauenärztin.',
    partnerTip:
      'Komm zum ersten Ultraschall mit, wenn sie das möchte. Es ist ein kurzer Termin, an den man sich lange erinnert.',
  },
  {
    week: 9,
    comparison: 'Weintraube',
    lengthCm: 2.3,
    lengthKind: 'ssl',
    weightG: 2,
    development:
      'Der Schwanzfortsatz bildet sich zurück, die Grundgestalt ist jetzt eindeutig menschlich. Die Zehen trennen sich, die Gelenke werden beweglich. Erste Muskelfasern verbinden sich mit den Nervenbahnen.',
    mother:
      'Das Blutvolumen steigt deutlich an, das Herz arbeitet mehr. Manche bekommen dadurch häufiger Kopfschmerzen – ausreichend trinken hilft oft mehr als Tabletten. Die Hosen werden am Bund eng, obwohl der Bauch noch nicht rund ist.',
    partnerTip:
      'Achte auf Trinkpausen. Ein volles Glas, das schon dasteht, wird eher getrunken als eines, das man sich holen müsste.',
  },
  {
    week: 10,
    comparison: 'Erdbeere',
    lengthCm: 3.1,
    lengthKind: 'ssl',
    weightG: 4,
    development:
      'Die Embryonalzeit endet – ab jetzt heißt euer Kind offiziell Fötus. Alle Organe sind angelegt und wachsen nun vor allem weiter. Die Fingernägel beginnen sich zu bilden, das Zwerchfell trennt Brust- und Bauchraum.',
    mother:
      'Die Hormonumstellung kann die Stimmung stark schwanken lassen – ohne dass es einen äußeren Anlass gibt. Zahnfleisch blutet leichter als sonst, weiche Zahnbürste und gründliche Pflege sind jetzt sinnvoll. Bei vielen lässt die Übelkeit ab dieser Woche langsam nach.',
    partnerTip:
      'Wenn die Stimmung kippt, such nicht nach dem Grund. Da sein und nicht diskutieren ist in dem Moment die hilfreichere Reaktion.',
  },
  {
    week: 11,
    comparison: 'Feige',
    lengthCm: 4.1,
    lengthKind: 'ssl',
    weightG: 7,
    development:
      'Der Kopf macht noch etwa die Hälfte der Körperlänge aus, der Rest holt jetzt auf. Das Kind öffnet und schließt die Fäuste und beginnt zu schlucken – Fruchtwasser wandert durch den Verdauungstrakt. Die Knochen im Gesicht verhärten sich.',
    mother:
      'Zwischen SSW 11 und 14 liegt das Zeitfenster für das Erst-Trimester-Screening samt Nackenfaltenmessung. Ob ihr es machen wollt, entscheidet ihr – sprecht vorher darüber, was ihr mit dem Ergebnis anfangen würdet. Die Gebärmutter wächst über das Schambein hinaus.',
    partnerTip:
      'Redet vor dem Screening in Ruhe darüber, was ein auffälliger Befund für euch bedeuten würde. Diese Frage will man nicht zum ersten Mal im Wartezimmer stellen.',
  },
  {
    week: 12,
    comparison: 'Limette',
    lengthCm: 5.4,
    lengthKind: 'ssl',
    weightG: 14,
    development:
      'Der Darm zieht sich vollständig in den Bauchraum zurück, wo er hingehört. Reflexe entstehen: Berührt etwas die Handfläche, schließt sich die Faust. Die Nieren produzieren erstmals Urin.',
    mother:
      'Das Fehlgeburtsrisiko sinkt mit dem Ende des ersten Trimesters deutlich – für viele der Zeitpunkt, an dem sie es weitererzählen. Die Übelkeit lässt bei den meisten nach, die Energie kommt zurück. Der Eltern-Kind-Pass startet mit der ersten großen Untersuchung.',
    partnerTip:
      'Besprecht gemeinsam, wem ihr wann erzählt. Es ist ihre Schwangerschaft, aber eure Nachricht – und niemand mag es, wenn andere es vor der eigenen Mutter wissen.',
  },
  {
    week: 13,
    comparison: 'Zitrone',
    lengthCm: 7.4,
    lengthKind: 'ssl',
    weightG: 23,
    development:
      'Die Stimmbänder bilden sich, auch wenn im Fruchtwasser kein Ton entsteht. Fingerabdrücke sind angelegt – dieses Muster bleibt ein Leben lang. Das Skelett wandelt sich schrittweise von Knorpel zu Knochen.',
    mother:
      'Viele beschreiben das zweite Trimester als die angenehmste Zeit der Schwangerschaft. Der Appetit kommt zurück, oft mit Nachdruck. Auf der Haut können dunklere Stellen entstehen, etwa eine Linie in der Bauchmitte.',
    partnerTip:
      'Nutzt die kommenden Wochen für Dinge, die später schwer werden: ein längerer Ausflug, ein Kinoabend, ein Essen ohne Zeitdruck.',
  },
  {
    week: 14,
    comparison: 'Pfirsich',
    lengthCm: 8.7,
    lengthKind: 'ssl',
    weightG: 43,
    development:
      'Das Kind macht Gesichter: Stirnrunzeln, Grimassen, Zusammenkneifen der Augen – reine Reflexübungen, aber die Muskeln lernen dabei. Feine Härchen, die Lanugobehaarung, überziehen den Körper. Der Hals ist deutlich ausgebildet, der Kopf sitzt nicht mehr direkt auf der Brust.',
    mother:
      'Das zweite Trimester beginnt. Der Bauch rundet sich langsam sichtbar. Rückenschmerzen können auftreten, weil sich der Schwerpunkt verschiebt – bequeme Schuhe helfen mehr, als man denkt.',
    partnerTip:
      'Frag, ob du beim Eincremen des Bauchs helfen sollst. Der praktische Nutzen ist überschaubar, der andere Teil nicht.',
  },
  {
    week: 15,
    comparison: 'Apfel',
    lengthCm: 10.1,
    lengthKind: 'ssl',
    weightG: 70,
    development:
      'Das Kind kann jetzt Licht wahrnehmen, obwohl die Augenlider noch geschlossen sind – helles Licht auf dem Bauch führt zu einer Reaktion. Die Beine sind länger als die Arme geworden. Im Knochenmark beginnt die Blutbildung.',
    mother:
      'Die Nasenschleimhäute schwellen hormonbedingt an, viele schnarchen plötzlich oder haben eine verstopfte Nase. Der Blutdruck ist in dieser Phase eher niedrig. Wenn dir schwindlig wird: hinsetzen, Beine hoch.',
    partnerTip:
      'Wenn nachts das Schnarchen zunimmt, mach kein Thema daraus. Ohrstöpsel sind die freundlichere Lösung.',
  },
  {
    week: 16,
    comparison: 'Avocado',
    lengthCm: 11.6,
    lengthKind: 'ssl',
    weightG: 100,
    development:
      'Die Muskeln im Rücken werden kräftiger, das Kind kann den Kopf aufrichten. Der Kreislauf pumpt bereits rund 25 Liter Blut pro Tag. Ohrknöchelchen und Gehörgang sind so weit, dass Schall wahrgenommen werden kann – vor allem der Herzschlag und die Verdauungsgeräusche der Mutter.',
    mother:
      'Manche spüren jetzt die ersten Bewegungen: ein Flattern, das man leicht für Verdauung hält. Beim ersten Kind kommt das oft erst um SSW 20. Die Gebärmutter liegt jetzt etwa auf halbem Weg zwischen Schambein und Nabel.',
    partnerTip:
      'Sprich in Richtung Bauch, wenn es sich nicht albern anfühlt. Deine Stimme ist tiefer und dringt besser durch – euer Kind lernt sie jetzt kennen.',
  },
  {
    week: 17,
    comparison: 'Birne',
    lengthCm: 13,
    lengthKind: 'ssl',
    weightG: 140,
    development:
      'Unter der Haut lagert sich braunes Fettgewebe ein, das nach der Geburt beim Wärmen hilft. Die Knorpelstrukturen verknöchern weiter, das Skelett wird stabiler. Die Schweißdrüsen legen sich an.',
    mother:
      'Der Bauch ist jetzt meist eindeutig als Schwangerschaftsbauch zu erkennen. Das Ziehen an den Seiten kommt von den Mutterbändern, die sich dehnen – unangenehm, aber harmlos. Schlaf auf der Seite wird bequemer als auf dem Rücken.',
    partnerTip:
      'Ein Stillkissen oder ein langes Seitenschläferkissen lohnt sich jetzt schon. Es wird die nächsten sechs Monate benutzt und danach beim Stillen weiter.',
  },
  {
    week: 18,
    comparison: 'Paprika',
    lengthCm: 14.2,
    lengthKind: 'ssl',
    weightG: 190,
    development:
      'Das Gehör funktioniert gut genug, dass laute Geräusche von außen eine Schreckreaktion auslösen. Bei Mädchen sind Gebärmutter und Eileiter angelegt, bei Buben ist das Genital im Ultraschall erkennbar. Die Nervenbahnen bekommen eine erste Schutzschicht.',
    mother:
      'Zwischen SSW 18 und 22 steht das große Organscreening an – der genaueste Blick auf euer Kind in der ganzen Schwangerschaft. Der Termin dauert länger als sonst, plant Zeit ein. Wenn ihr das Geschlecht wissen wollt, sagt es vorher.',
    partnerTip:
      'Nimm dir für das Organscreening frei. Es ist der Termin, bei dem man das Kind am deutlichsten sieht – und der, bei dem man am wenigsten allein sein möchte.',
  },
  {
    week: 19,
    comparison: 'Mango',
    lengthCm: 15.3,
    lengthKind: 'ssl',
    weightG: 240,
    development:
      'Eine weiße, fettige Schicht – die Käseschmiere – legt sich schützend über die Haut. Ohne sie würde die Haut im Fruchtwasser aufweichen. Die Sinneszentren im Gehirn für Tasten, Schmecken, Riechen, Hören und Sehen entwickeln sich getrennt voneinander.',
    mother:
      'Die Bewegungen werden deutlicher und regelmäßiger. Manche bekommen Krämpfe in den Waden, oft nachts – Magnesium und Bewegung helfen häufig. Die Haut am Bauch spannt und juckt gelegentlich.',
    partnerTip:
      'Bei nächtlichen Wadenkrämpfen: Fuß zum Körper ziehen und die Wade dehnen. Das kannst du übernehmen, das geht im Halbschlaf schlecht allein.',
  },
  {
    week: 20,
    comparison: 'Banane',
    lengthCm: 25.6,
    lengthKind: 'sfl',
    weightG: 300,
    development:
      'Ab jetzt wird nicht mehr die Scheitel-Steiß-Länge gemessen, sondern die volle Körperlänge – daher der Sprung in der Tabelle. Das Kind schläft und wacht in eigenen Rhythmen, oft genau dann aktiv, wenn die Mutter zur Ruhe kommt. Haare und Augenbrauen beginnen zu wachsen.',
    mother:
      'Halbzeit. Der obere Rand der Gebärmutter erreicht ungefähr den Nabel. Sodbrennen wird häufiger, weil der Magen weniger Platz hat – kleine Portionen und nicht direkt vor dem Schlafengehen essen.',
    partnerTip:
      'Halbzeit ist ein guter Anlass, konkret zu werden: Wer nimmt wie lange Karenz, wie teilt ihr euch die ersten Monate auf? Das Gespräch wird nicht leichter, wenn ihr es aufschiebt.',
  },
  {
    week: 21,
    comparison: 'Karotte',
    lengthCm: 26.7,
    lengthKind: 'sfl',
    weightG: 360,
    development:
      'Der Verdauungstrakt übt: Fruchtwasser wird geschluckt, Wasser aufgenommen, der Rest sammelt sich im Darm. Die Geschmacksknospen sind funktionsfähig – was die Mutter isst, schmeckt das Kind im Fruchtwasser mit. Das Knochenmark übernimmt die Blutbildung vollständig.',
    mother:
      'Der Appetit ist oft ausgeprägt, das Kind holt jetzt beim Gewicht auf. Krampfadern und Hämorrhoiden können auftreten – Beine hochlegen und Bewegung wirken vorbeugend. Die Bewegungen sind von außen manchmal schon sichtbar.',
    partnerTip:
      'Leg die Hand auf den Bauch und warte in Ruhe. Beim ersten Mal dauert es oft zehn Minuten, bis du wirklich etwas spürst – aber es lohnt sich.',
  },
  {
    week: 22,
    comparison: 'Zuckermais',
    lengthCm: 27.8,
    lengthKind: 'sfl',
    weightG: 430,
    development:
      'Das Kind sieht jetzt wie ein sehr kleines Neugeborenes aus, nur noch ohne Fettpolster. Lippen, Augenlider und Augenbrauen sind klar erkennbar. Die Augen sind fertig gebaut, die Farbpigmente in der Iris fehlen noch.',
    mother:
      'Braxton-Hicks-Kontraktionen können beginnen: Der Bauch wird für eine halbe Minute hart und entspannt sich wieder. Sie sind unregelmäßig und schmerzlos – Übungswehen, keine Geburtswehen. Bei Regelmäßigkeit oder Schmerz gilt: nachfragen statt abwarten.',
    partnerTip:
      'Merk dir den Unterschied: Übungswehen sind unregelmäßig und tun nicht weh. Alles, was regelmäßig kommt, gehört bei der Hebamme besprochen.',
  },
  {
    week: 23,
    comparison: 'Grapefruit',
    lengthCm: 28.9,
    lengthKind: 'sfl',
    weightG: 500,
    development:
      'Die Lunge bildet die feinen Verzweigungen aus, an deren Enden später der Gasaustausch stattfindet. Erste Zellen produzieren Surfactant – den Stoff, der die Lungenbläschen offen hält. Das Innenohr ist fertig, das Kind entwickelt einen Gleichgewichtssinn und merkt, ob es oben oder unten liegt.',
    mother:
      'Wassereinlagerungen in Füßen und Händen sind normal, plötzliche starke Schwellungen zusammen mit Kopfschmerzen dagegen nicht – das gehört sofort abgeklärt. Ringe werden eventuell zu eng. Der Bauch wächst jetzt spürbar schneller.',
    partnerTip:
      'Wenn Hände oder Gesicht plötzlich stark anschwellen, sie Kopfschmerzen oder Sehstörungen hat: nicht abwarten, sondern anrufen. Das ist einer der wenigen Punkte, wo Drängen richtig ist.',
  },
  {
    week: 24,
    comparison: 'Melanzani',
    lengthCm: 30,
    lengthKind: 'sfl',
    weightG: 600,
    development:
      'Ab dieser Woche gilt euer Kind als grundsätzlich außerhalb der Gebärmutter lebensfähig – mit intensivmedizinischer Unterstützung und ohne Garantie, aber die Grenze ist überschritten. Das Gehirn wächst rasant und bildet die typischen Furchen. Die Haut ist noch durchscheinend und faltig.',
    mother:
      'Zwischen SSW 24 und 28 steht der Zuckerbelastungstest an, der Schwangerschaftsdiabetes ausschließt. Er ist unangenehm, aber wichtig. Der Bauch wird beim Bücken zum Hindernis.',
    partnerTip:
      'Der Zuckertest dauert zwei Stunden mit Nüchternphase. Fahr sie hin, bring danach etwas Ordentliches zu essen mit.',
  },
  {
    week: 25,
    comparison: 'Kohlrabi',
    lengthCm: 34.6,
    lengthKind: 'sfl',
    weightG: 660,
    development:
      'Die Nasenlöcher öffnen sich, das Kind beginnt Atembewegungen zu üben – Fruchtwasser rein, Fruchtwasser raus. Unter der Haut lagert sich mehr Fett ein, die Falten glätten sich langsam. Die Hände sind vollständig entwickelt und werden intensiv erkundet.',
    mother:
      'Der Schlaf wird unruhiger: Position finden, Toilette, Sodbrennen. Ein Nickerchen tagsüber ist keine Schwäche, sondern vernünftig. Die Haare wirken bei vielen dichter und kräftiger als sonst.',
    partnerTip:
      'Wenn sie tagsüber schläft, halt den Haushalt leise statt sie zu wecken, weil Besuch kommt. Besuch kann warten.',
  },
  {
    week: 26,
    comparison: 'Zucchini',
    lengthCm: 35.6,
    lengthKind: 'sfl',
    weightG: 760,
    development:
      'Die Augen öffnen sich zum ersten Mal. Das Kind reagiert auf helles Licht und auf laute Geräusche mit Bewegung. Die Gehirnströme zeigen inzwischen Muster, die denen eines Neugeborenen ähneln.',
    mother:
      'Der Bauch drückt auf Zwerchfell und Blase gleichzeitig – kurzatmig und häufig auf der Toilette. Rückenschmerzen nehmen zu; Schwimmen entlastet spürbar. Erste Gedanken an die Kliniktasche sind jetzt keineswegs zu früh.',
    partnerTip:
      'Meldet euch für einen Geburtsvorbereitungskurs an, falls noch nicht geschehen. Die guten Termine sind früh ausgebucht.',
  },
  {
    week: 27,
    comparison: 'Karfiol',
    lengthCm: 36.6,
    lengthKind: 'sfl',
    weightG: 875,
    development:
      'Das Kind hat einen erkennbaren Schlaf-Wach-Rhythmus mit Traumschlafphasen. Es kann Schluckauf bekommen – von außen als rhythmisches Zucken spürbar, völlig harmlos. Die Lunge produziert zunehmend Surfactant.',
    mother:
      'Das Ende des zweiten Trimesters. Die Gewichtszunahme beschleunigt sich. Kurzatmigkeit beim Treppensteigen ist normal, plötzliche Atemnot in Ruhe nicht.',
    partnerTip:
      'Zähl beim nächsten Schluckauf mit, wie lange er dauert. So merkt ihr beide, wie regelmäßig euer Kind seinen eigenen Rhythmus hat.',
  },
  {
    week: 28,
    comparison: 'Melanzani, groß',
    lengthCm: 37.6,
    lengthKind: 'sfl',
    weightG: 1005,
    development:
      'Das dritte Trimester beginnt. Das Kind blinzelt, die Wimpern sind gewachsen. Es kann jetzt zwischen der Stimme der Mutter und fremden Stimmen unterscheiden und reagiert unterschiedlich darauf.',
    mother:
      'Die Vorsorgetermine werden häufiger. Wenn dein Blut Rhesus-negativ ist, steht jetzt meist die Anti-D-Prophylaxe an. Das Kind bewegt sich weiterhin regelmäßig – auf Veränderungen im Muster solltest du achten.',
    partnerTip:
      'Sprich viel und normal in ihrer Nähe. Euer Kind hört mit und erkennt eure Stimmen nach der Geburt wieder – das beruhigt dann tatsächlich.',
  },
  {
    week: 29,
    comparison: 'Butternusskürbis',
    lengthCm: 38.6,
    lengthKind: 'sfl',
    weightG: 1150,
    development:
      'Die Knochen härten weiter aus und brauchen viel Kalzium – das Kind holt es sich notfalls aus den Reserven der Mutter. Das Gehirn steuert jetzt die Körpertemperatur selbst. Der Platz wird enger, die Tritte werden dafür deutlicher.',
    mother:
      'Kalziumreiche Ernährung wird jetzt wichtiger. Sodbrennen und Verstopfung sind häufige Begleiter – ballaststoffreich essen und viel trinken. Manche spüren ein Ziehen im Becken, wenn sich die Bänder lockern.',
    partnerTip:
      'Bau die Möbel fürs Kinderzimmer jetzt auf, nicht in vier Wochen. Später ist die Wahrscheinlichkeit hoch, dass gleichzeitig etwas anderes dringend ist.',
  },
  {
    week: 30,
    comparison: 'Weißkohl',
    lengthCm: 39.9,
    lengthKind: 'sfl',
    weightG: 1320,
    development:
      'Die Lanugobehaarung verschwindet langsam wieder, das Kopfhaar wächst. Das Knochenmark produziert nun eigenständig rote Blutkörperchen. Die Augen können scharf stellen, wenn auch nur auf kurze Distanz.',
    mother:
      'Die Müdigkeit des ersten Trimesters kommt oft zurück. Der Bauch macht Alltagsbewegungen mühsam: Schuhe binden, aus dem Auto steigen. Übungswehen werden häufiger und deutlicher spürbar.',
    partnerTip:
      'Übernimm ab jetzt dauerhaft das, was Bücken erfordert – Schuhe, Wäsche, untere Schränke. Ohne jedes Mal zu fragen.',
  },
  {
    week: 31,
    comparison: 'Kokosnuss',
    lengthCm: 41.1,
    lengthKind: 'sfl',
    weightG: 1500,
    development:
      'Alle fünf Sinne funktionieren. Das Kind dreht den Kopf gezielt in Richtung von Geräuschen und Licht. Die Menge des Fruchtwassers erreicht ihren Höchststand – ab jetzt nimmt sie langsam wieder ab, weil das Kind mehr Raum einnimmt.',
    mother:
      'Aus der Brust kann Vormilch austreten, das Kolostrum. Es ist gelblich, dickflüssig und völlig normal – Stilleinlagen helfen. Kurzatmigkeit ist in dieser Phase auf dem Höhepunkt, weil das Zwerchfell am meisten hochgedrückt wird.',
    partnerTip:
      'Fahrt die Strecke zur Klinik einmal ab und schaut, wo man parkt und wo der Eingang für Geburten ist. Nachts, unter Druck, ist das Gold wert.',
  },
  {
    week: 32,
    comparison: 'Honigmelone',
    lengthCm: 42.4,
    lengthKind: 'sfl',
    weightG: 1700,
    development:
      'Die meisten Kinder drehen sich in dieser Phase in die Schädellage – Kopf nach unten. Die Fingernägel reichen bis zu den Fingerkuppen. Das Immunsystem übernimmt Antikörper von der Mutter, ein Schutz, der nach der Geburt noch Monate hält.',
    mother:
      'Die letzte reguläre Eltern-Kind-Pass-Untersuchung vor der Geburt steht an. Der Bauch drückt spürbar nach oben, Sodbrennen erreicht oft seinen Höhepunkt. Wenn das Kind noch nicht gedreht ist: Es hat noch Zeit.',
    partnerTip:
      'Packt gemeinsam die Kliniktasche. Nicht, weil es jetzt losgeht, sondern damit ihr beide wisst, wo was liegt.',
  },
  {
    week: 33,
    comparison: 'Ananas',
    lengthCm: 43.7,
    lengthKind: 'sfl',
    weightG: 1920,
    development:
      'Die Schädelknochen sind noch nicht verwachsen – sie können sich bei der Geburt übereinanderschieben. Die Fontanellen bleiben nach der Geburt noch Monate weich. Das Kind nimmt jetzt etwa 200 Gramm pro Woche zu.',
    mother:
      'Der Schlaf wird noch unruhiger, viele wachen nachts mehrmals auf. Das ist unangenehm, bereitet den Körper aber auf die kommende Zeit vor. Beckenbodenübungen zahlen sich jetzt aus.',
    partnerTip:
      'Wenn sie nachts wach liegt, muss du nicht wach bleiben. Aber ein kurzes „Alles okay?“ statt Weiterschlafen ohne Reaktion macht einen Unterschied.',
  },
  {
    week: 34,
    comparison: 'Cantaloupe-Melone',
    lengthCm: 45,
    lengthKind: 'sfl',
    weightG: 2150,
    development:
      'Die Lunge ist weitgehend reif – bei einer Geburt jetzt wäre meist keine Beatmung nötig. Die Käseschmiere wird dicker und schützt die Haut in den letzten Wochen. Die Fingernägel sind vollständig ausgebildet.',
    mother:
      'Der Bauch senkt sich bei manchen bereits, das Atmen wird leichter, der Druck auf die Blase größer. Das Becken kann bei jedem Schritt ziehen. Ab jetzt lohnt es sich, den Wehen-Timer im Blick zu haben.',
    partnerTip:
      'Speicher die Nummern von Hebamme, Klinik und Rettung so ab, dass du sie im Halbschlaf findest. Nicht suchen müssen ist der halbe Job.',
  },
  {
    week: 35,
    comparison: 'Galiamelone',
    lengthCm: 46.2,
    lengthKind: 'sfl',
    weightG: 2380,
    development:
      'Die Nieren sind fertig entwickelt, die Leber verarbeitet erste Abbauprodukte selbst. Das Kind bewegt sich weniger ausladend, weil der Platz fehlt – die Bewegungen sind dafür kräftiger. Die Position ist meist die, in der es zur Geburt bleibt.',
    mother:
      'Kurze Wege werden anstrengend. Der Mutterschutz beginnt in Österreich acht Wochen vor dem errechneten Termin – also etwa jetzt. Kontrolliert, dass alle Formulare eingereicht sind.',
    partnerTip:
      'Kläre deinen Papamonat bzw. die Karenz jetzt schriftlich mit dem Dienstgeber ab, falls noch offen. Fristen sind unerbittlich.',
  },
  {
    week: 36,
    comparison: 'Römersalat',
    lengthCm: 47.4,
    lengthKind: 'sfl',
    weightG: 2620,
    development:
      'Das Kind gilt ab SSW 37 als termingerecht – diese Woche ist die letzte davor. Es trainiert Saugen und Schlucken, oft mit dem Daumen im Mund. Der Darm ist mit Mekonium gefüllt, dem ersten Stuhl.',
    mother:
      'Der Test auf B-Streptokokken steht üblicherweise zwischen SSW 35 und 37 an. Der Kopf des Kindes tritt bei vielen ins Becken ein. Ab jetzt kann es jederzeit losgehen, auch wenn die meisten noch warten.',
    partnerTip:
      'Tank das Auto voll und halte es voll. Ab jetzt ist ein leerer Tank die Art von Kleinigkeit, die im falschen Moment groß wird.',
  },
  {
    week: 37,
    comparison: 'Mangold',
    lengthCm: 48.6,
    lengthKind: 'sfl',
    weightG: 2860,
    development:
      'Ab jetzt gilt euer Kind als reif geboren. Es nimmt weiter Fett zu und rundet sich. Die Lanugobehaarung ist bis auf Reste an Schultern und Rücken verschwunden.',
    mother:
      'Der Schleimpfropf kann abgehen – manchmal Wochen vor der Geburt, manchmal Stunden davor. Er sagt nichts Verlässliches über den Zeitpunkt aus. Vorwehen können jetzt in Serien kommen.',
    partnerTip:
      'Lern die 4-1-1-Regel: Wehen alle 4 Minuten, je 1 Minute lang, über 1 Stunde hinweg. Das ist der übliche Anhaltspunkt für den Aufbruch – die Hebamme entscheidet, nicht die Regel.',
  },
  {
    week: 38,
    comparison: 'Lauch',
    lengthCm: 49.8,
    lengthKind: 'sfl',
    weightG: 3080,
    development:
      'Die Organe sind vollständig auf das Leben außerhalb vorbereitet. Das Kind greift kräftig zu, wenn etwas die Handfläche berührt. Es reagiert deutlich auf die Stimmen, die es kennt.',
    mother:
      'Der Bauch ist auf dem Höhepunkt, jede Position wird nach kurzer Zeit unbequem. Durchfall oder Übelkeit können ein Vorbote der Geburt sein. Regelmäßiger werdende Wehen gehören ab jetzt gezählt.',
    partnerTip:
      'Bereite ein paar einfache Mahlzeiten vor und friere sie ein. In der ersten Woche nach der Geburt kocht niemand.',
  },
  {
    week: 39,
    comparison: 'Wassermelone, klein',
    lengthCm: 50.7,
    lengthKind: 'sfl',
    weightG: 3290,
    development:
      'Das Kind ist vollständig ausgereift und nimmt vor allem noch zu. Die Haut ist rosig und mit Käseschmiere überzogen. Der Kopfumfang entspricht ungefähr dem Brustumfang.',
    mother:
      'Warten ist jetzt die Hauptbeschäftigung – und oft anstrengender als alles davor. Bewegung, Spaziergänge und Ablenkung helfen mehr als Beobachten. Fruchtwasserabgang gehört immer angerufen, egal zu welcher Uhrzeit.',
    partnerTip:
      'Frag nicht jeden Tag, ob es losgeht. Sie merkt es früher als du und die Frage macht das Warten länger.',
  },
  {
    week: 40,
    comparison: 'Wassermelone',
    lengthCm: 51.2,
    lengthKind: 'sfl',
    weightG: 3460,
    development:
      'Der errechnete Termin ist erreicht – nur etwa vier von hundert Kindern kommen genau an diesem Tag. Alles ist fertig, das Kind wartet auf das hormonelle Startsignal. Die Plazenta versorgt weiterhin zuverlässig.',
    mother:
      'Der Termin ist ein Stichtag, keine Deadline. Rund um den ET wird häufiger kontrolliert, meist mit CTG und Ultraschall. Ruhe zu bewahren ist leichter gesagt als getan – und trotzdem das Richtige.',
    partnerTip:
      'Wehr Anfragen von außen ab. Ein „Wir melden uns, wenn es etwas gibt“ in die Familiengruppe erspart ihr fünfzig Nachrichten.',
  },
  {
    week: 41,
    comparison: 'Kürbis',
    lengthCm: 51.7,
    lengthKind: 'sfl',
    weightG: 3600,
    development:
      'Das Kind wächst weiter, wenn auch langsamer. Die Käseschmiere wird weniger, die Haut kann trockener werden. Die Nägel reichen jetzt oft über die Fingerkuppen hinaus – die ersten Kratzer sind vorprogrammiert.',
    mother:
      'Kontrollen finden nun alle zwei bis drei Tage statt. Es wird über eine Einleitung gesprochen – lass dir die Gründe und Alternativen in Ruhe erklären. Übergangen zu werden ist bei dieser Entscheidung besonders unangenehm.',
    partnerTip:
      'Geh zu den Kontrollterminen mit und merk dir die Fragen, die sie stellen wollte. Im Termin selbst vergisst man die Hälfte.',
  },
  {
    week: 42,
    comparison: 'Kürbis, groß',
    lengthCm: 52,
    lengthKind: 'sfl',
    weightG: 3700,
    development:
      'Übertragung – nur wenige Schwangerschaften gehen so weit. Die Plazenta arbeitet weiterhin, wird aber engmaschig überwacht. Die Haut des Kindes kann pergamentartig wirken, das legt sich nach der Geburt rasch.',
    mother:
      'Ab SSW 41+0 bis 42+0 wird in Österreich in der Regel eine Einleitung empfohlen. Die Überwachung ist jetzt engmaschig, meist täglich. Das Ende ist absehbar, auch wenn es sich nicht so anfühlt.',
    partnerTip:
      'Sag ihr, dass sie das gut macht – ohne Ratschlag hinterher. In dieser Woche ist Anerkennung nützlicher als jeder Tipp.',
  },
]

const BY_WEEK = new Map(PREGNANCY_WEEKS.map((entry) => [entry.week, entry]))

export function pregnancyWeekContent(week: number): PregnancyWeekContent | null {
  return BY_WEEK.get(week) ?? null
}

export const FIRST_CONTENT_WEEK = PREGNANCY_WEEKS[0]!.week
export const LAST_CONTENT_WEEK = PREGNANCY_WEEKS[PREGNANCY_WEEKS.length - 1]!.week
